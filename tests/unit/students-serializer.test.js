const appRoot = require('app-root-path');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const _ = require('lodash');
const sinon = require('sinon');

const studentsSerializer = appRoot.require('api/v1/serializers/students-serializer');
const { openapi } = appRoot.require('utils/load-openapi');

chai.should();
chai.use(chaiAsPromised);
const { assert } = chai;

describe('Test students-serializer', () => {
  it('test getSerializerArgs', () => {
    const { getSerializerArgs } = studentsSerializer;
    const fakeType = 'fakeType';
    const fakeId = 'fakeId';
    const fakePath = 'fakePath';
    const fakeBaseUrl = `/v1/students/${fakeId}/${fakePath}`;
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
        expectedLink: fakeBaseUrl,
      },
      {
        isSingle: true,
        expectedResult: 'fakeSingleResult',
        fakeParams: { fakeKey: 'fakeValue' },
        expectedLink: `${fakeBaseUrl}?fakeKey=fakeValue`,
      },
      {
        isSingle: true,
        expectedResult: 'fakeSingleResult',
        fakeParams: undefined,
        expectedLink: fakeBaseUrl,
      },
      {
        isSingle: false,
        expectedResult: 'fakePluralResult',
        fakeParams: undefined,
        expectedLink: fakeBaseUrl,
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
  });
});
