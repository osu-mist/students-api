const appRoot = require('app-root-path');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const _ = require('lodash');
const randomize = require('randomatic');
const sinon = require('sinon');

const studentsSerializer = appRoot.require('api/v1/serializers/students-serializer');
const { openapi } = appRoot.require('utils/load-openapi');

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { assert, expect } = chai;

describe('Test students-serializer', () => {
  const fakeId = 'fakeId';
  const fakeBaseUrl = `/v1/students/${fakeId}`;

  it('test fourDigitToTime', () => {
    const { fourDigitToTime } = studentsSerializer;
    assert.isNull(fourDigitToTime(null));

    const invalidStrings = [];
    while (invalidStrings.length < 10) {
      const length = Math.floor(Math.random() * Math.floor(10));
      if (length !== 4) {
        invalidStrings.push(randomize('aA0!', length));
      } else {
        invalidStrings.push(randomize('aA!', length));
      }
    }
    _.each(invalidStrings, (string) => {
      assert.equal(fourDigitToTime(string), 'Incorrect time format');
    });

    const validStrings = [];
    while (validStrings.length < 10) {
      validStrings.push(randomize('0', 4));
    }
    _.each(validStrings, (string) => {
      assert.equal(fourDigitToTime(string), `${string.substring(0, 2)}:${string.substring(2, 4)}:00`);
    });
  });
  it('test getSerializerArgs', () => {
    const { getSerializerArgs } = studentsSerializer;
    const fakeType = 'fakeType';
    const fakePath = 'fakePath';
    const fakePathUrl = `${fakeBaseUrl}/${fakePath}`;
    const fakeDataSchema = {
      properties: {
        type: {
          enum: [fakeType],
        },
        attributes: {
          properties: {
            fakeAttribute1: null,
            fakeAttribute2: null,
            fakeAttribute3: null,
          },
        },
      },
    };
    const fakeDefinitions = {
      fakeSingleResult: {
        properties: {
          data: fakeDataSchema,
        },
      },
      fakePluralResult: {
        properties: {
          data: {
            type: 'array',
            items: fakeDataSchema,
          },
        },
      },
    };

    sinon.stub(openapi, 'definitions').value(fakeDefinitions);

    const testCases = [
      {
        isSingle: true,
        expectedResult: 'fakeSingleResult',
        fakeParams: {},
        expectedLink: fakePathUrl,
      },
      {
        isSingle: true,
        expectedResult: 'fakeSingleResult',
        fakeParams: { fakeKey: 'fakeValue' },
        expectedLink: `${fakePathUrl}?fakeKey=fakeValue`,
      },
      {
        isSingle: true,
        expectedResult: 'fakeSingleResult',
        fakeParams: undefined,
        expectedLink: fakePathUrl,
      },
      {
        isSingle: false,
        expectedResult: 'fakePluralResult',
        fakeParams: undefined,
        expectedLink: fakePathUrl,
      },
    ];

    _.each(testCases, (testCase) => {
      const {
        isSingle,
        fakeParams,
        expectedLink,
        expectedResult,
      } = testCase;
      const expectedArgs = {
        identifierField: 'identifierField',
        resourceKeys: ['fakeAttribute1', 'fakeAttribute2', 'fakeAttribute3'],
        resourcePath: 'student',
        topLevelSelfLink: expectedLink,
        enableDataLinks: false,
        resourceType: fakeType,
      };

      const actualArgs = getSerializerArgs(fakeId, expectedResult, fakePath, isSingle, fakeParams);
      assert.deepEqual(actualArgs, expectedArgs);
    });

    sinon.restore();
  });
  it('test serializeGpa', () => {
    const { serializeGpa } = studentsSerializer;
    const resourceType = 'gpa';
    const rawGpaLevels = [
      {
        gpa: '3.96',
        gpaCreditHours: '103',
        gpaType: 'Institution',
        creditHoursAttempted: '107',
        creditHoursEarned: '107',
        creditHoursPassed: '107',
        level: 'Undergraduate',
        qualityPoints: '407.50',
      },
      {
        gpa: '3.97',
        gpaCreditHours: '146',
        gpaType: 'Overall',
        creditHoursAttempted: '174',
        creditHoursEarned: '174',
        creditHoursPassed: '174',
        level: 'Undergraduate',
        qualityPoints: '579.50',
      },
    ];

    const serializedGpaLevels = serializeGpa(rawGpaLevels, fakeId);
    expect(serializedGpaLevels)
      .to.containSubset(
        {
          links: {
            self: `${fakeBaseUrl}/${resourceType}`,
          },
          data: {
            id: fakeId,
            type: resourceType,
            links: { self: null },
          },
        },
      ).and.to.have.nested.property('data.attributes.gpaLevels');

    const floatFields = [
      'gpaCreditHours', 'creditHoursAttempted', 'creditHoursEarned', 'creditHoursPassed',
    ];
    const { gpaLevels } = serializedGpaLevels.data.attributes;
    _.each(gpaLevels, (gpaLevel) => {
      assert.hasAllKeys(gpaLevel, _.keys(openapi.definitions.GradePointAverage.properties));
      _.each(floatFields, (floatField) => {
        assert.isNumber(gpaLevel[floatField]);
      });
    });
  });
  it('test serializeAccountBalance', () => {
    const { serializeAccountBalance } = studentsSerializer;
    const resourceType = 'account-balance';
    const rawAccountBalance = {
      identifierField: fakeId,
      currentBalance: '99.99',
    };

    const serializedAccountBalance = serializeAccountBalance(rawAccountBalance, fakeId);
    expect(serializedAccountBalance)
      .to.containSubset(
        {
          links: {
            self: `${fakeBaseUrl}/${resourceType}`,
          },
          data: {
            id: fakeId,
            type: resourceType,
            links: { self: null },
            attributes: {
              currentBalance: 99.99,
            },
          },
        },
      );
  });
  it('test serializeAccountTransactions', () => {
    const { serializeAccountTransactions } = studentsSerializer;
    const resourceType = 'account-transactions';
    const rawTransactions = [
      {
        amount: '2850',
        description: 'Ford Loan-Subsidized',
        entryDate: '2016-12-31 12:29:54',
      },
      {
        amount: '1814',
        description: 'Presidential Scholar 001100',
        entryDate: '2017-11-12 12:13:42',
      },
    ];

    const serializedTransactions = serializeAccountTransactions(rawTransactions, fakeId);
    expect(serializedTransactions)
      .to.containSubset(
        {
          links: {
            self: `${fakeBaseUrl}/${resourceType}`,
          },
          data: {
            id: fakeId,
            type: resourceType,
            links: { self: null },
          },
        },
      ).and.to.have.nested.property('data.attributes.transactions');

    const { transactions } = serializedTransactions.data.attributes;
    _.each(transactions, (transaction) => {
      assert.hasAllKeys(transaction, _.keys(
        openapi.definitions.AccountTransactionsResult.properties.data
          .properties.attributes.properties.transactions.items.properties,
      ));
      assert.isNotNaN(Date.parse(transaction.entryDate));
      assert.isNumber(transaction.amount);
    });
  });
});
