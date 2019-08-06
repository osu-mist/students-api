/* eslint no-unused-expressions: 0 */

const appRoot = require('app-root-path');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const _ = require('lodash');
const randomize = require('randomatic');
const sinon = require('sinon');

const studentsSerializer = appRoot.require('api/v1/serializers/students-serializer');
const testData = appRoot.require('tests/unit/test-data');
const { openapi } = appRoot.require('utils/load-openapi');

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiSubset);
const { expect } = chai;

describe('Test students-serializer', () => {
  const { fakeId, fakeBaseUrl } = testData;
  const resourceSubsetSchema = (resourceType, resourceAttributes) => {
    const schema = {
      links: {
        self: `${fakeBaseUrl}/${resourceType}`,
      },
      data: {
        id: fakeId,
        type: resourceType,
        links: { self: null },
      },
    };
    if (resourceAttributes) {
      schema.data.attributes = resourceAttributes;
    }
    return schema;
  };

  /**
   * Helper function for lite-testing single resource
   *
   * @param {object} serializedResource serialized resource
   * @param {string} resourceType resource type
   * @param {string} nestedProps field name of the nested properties
   */
  const testSingleResource = (serializedResource, resourceType, nestedProps) => {
    expect(serializedResource).to.containSubset(resourceSubsetSchema(resourceType));

    if (nestedProps) {
      expect(serializedResource).to.have.nested.property(`data.attributes.${nestedProps}`);
    }
  };

  /**
   * Helper function for lite-testing multiple resources
   *
   * @param {object} serializedResources serialized resources
   * @returns {object} data object from serialized resources for further use
   */
  const testMultipleResources = (serializedResources) => {
    const serializedResourcesData = serializedResources.data;
    expect(serializedResources).to.have.keys('data', 'links');
    expect(serializedResourcesData).to.be.an('array');

    return serializedResourcesData;
  };

  /**
   * Helper function to get definition from openapi specification
   *
   * @param {string} definition the name of definition
   * @param {object} nestedOption nested option
   * @param {boolean} nestedOption.dataItem a boolean which represents whether it's a data item
   * @param {string} nestedOption.dataField data field name
   * @returns {object} definition from openapi specification
   */
  const getDefinitionProps = (definition, nestedOption) => {
    let result = openapi.definitions[definition].properties;
    if (nestedOption) {
      const { dataItem, dataField } = nestedOption;
      if (dataItem) {
        result = result.data.items.properties.attributes.properties;
      } else if (dataField) {
        result = result.data.properties.attributes.properties[dataField].items.properties;
      }
    }
    return result;
  };

  /**
   * Helper function to check certain fields are parsed as numbers
   *
   * @param {object} resource resource to be checked
   * @param {string[]} numberFields numbers fields
   */
  const expectNumberFields = (resource, numberFields) => {
    _.each(numberFields, (numberField) => {
      expect(resource[numberField]).to.be.a('number');
    });
  };

  it('test fourDigitToTime', () => {
    const { fourDigitToTime } = studentsSerializer;
    expect(fourDigitToTime(null)).to.be.null;

    const invalidStrings = [];
    while (invalidStrings.length < 10) {
      const length = Math.floor(Math.random() * 10);
      if (length !== 4) {
        invalidStrings.push(randomize('aA0!', length));
      } else {
        invalidStrings.push(randomize('aA!', length));
      }
    }
    _.each(invalidStrings, (string) => {
      expect(fourDigitToTime(string)).to.equal('Incorrect time format');
    });

    const validStrings = [];
    while (validStrings.length < 10) {
      validStrings.push(randomize('0', 4));
    }
    _.each(validStrings, (string) => {
      expect(fourDigitToTime(string)).to.equal(`${string.substring(0, 2)}:${string.substring(2, 4)}:00`);
    });
  });
  it('test getSerializerArgs', () => {
    const { getSerializerArgs } = studentsSerializer;
    const {
      argsTestCases,
      fakeType,
      fakePath,
      fakeDefinitions,
    } = testData;

    sinon.stub(openapi, 'definitions').value(fakeDefinitions);

    _.each(argsTestCases, (testCase) => {
      const {
        isSingle,
        fakeParams,
        expectedLink,
        expectedResult,
      } = testCase;
      const expectedArgs = {
        identifierField: 'identifierField',
        resourceKeys: ['fakeAttribute1', 'fakeAttribute2', 'fakeAttribute3'],
        resourcePath: 'students',
        topLevelSelfLink: expectedLink,
        enableDataLinks: false,
        resourceType: fakeType,
      };

      const actualArgs = getSerializerArgs(fakeId, expectedResult, fakePath, isSingle, fakeParams);
      expect(actualArgs).to.deep.equal(expectedArgs);
    });

    sinon.restore();
  });
  it('test serializeGpa', () => {
    const { serializeGpa } = studentsSerializer;
    const { rawGpaLevels } = testData;
    const resourceType = 'gpa';

    const serializedGpaLevels = serializeGpa(rawGpaLevels, fakeId);
    testSingleResource(serializedGpaLevels, resourceType, 'gpaLevels');

    const numberFields = [
      'gpaCreditHours', 'creditHoursAttempted', 'creditHoursEarned', 'creditHoursPassed',
    ];
    const { gpaLevels } = serializedGpaLevels.data.attributes;
    _.each(gpaLevels, (gpaLevel) => {
      expect(gpaLevel).to.have.all.keys(_.keys(getDefinitionProps('GradePointAverage')));
      expectNumberFields(gpaLevel, numberFields);
    });
  });
  it('test serializeAccountBalance', () => {
    const { serializeAccountBalance } = studentsSerializer;
    const { rawAccountBalance } = testData;
    const resourceType = 'account-balance';

    const serializedAccountBalance = serializeAccountBalance(rawAccountBalance, fakeId);
    testSingleResource(serializedAccountBalance, resourceType);
    expect(serializedAccountBalance.data.attributes.currentBalance).to.be.a('number');
  });
  it('test serializeAccountTransactions', () => {
    const { serializeAccountTransactions } = studentsSerializer;
    const { rawTransactions } = testData;
    const resourceType = 'account-transactions';

    const serializedTransactions = serializeAccountTransactions(rawTransactions, fakeId);
    testSingleResource(serializedTransactions, resourceType, 'transactions');

    const { transactions } = serializedTransactions.data.attributes;
    _.each(transactions, (transaction) => {
      expect(transaction).to.have.all.keys(_.keys(
        getDefinitionProps('AccountTransactionsResult', { dataField: 'transactions' }),
      ));
      expect(Date.parse(transaction.entryDate)).to.not.be.NaN;
      expectNumberFields(transaction, ['amount']);
    });
  });
  it('test serializeAcademicStatus', () => {
    const { serializeAcademicStatus } = studentsSerializer;
    const { rawAcademicStatus } = testData;
    const resourceType = 'academic-status';

    const serializedAcademicStatus = serializeAcademicStatus(rawAcademicStatus, fakeId);
    const serializedAcademicStatusData = testMultipleResources(serializedAcademicStatus);

    _.each(serializedAcademicStatusData, (resource) => {
      expect(resource)
        .to.contain.keys('attributes')
        .and.to.containSubset({
          id: `${fakeId}-${resource.attributes.term}`,
          type: resourceType,
          links: { self: null },
        });

      const { attributes } = resource;
      expect(attributes).to.have.all.keys(_.keys(
        getDefinitionProps('AcademicStatusResult', { dataItem: true }),
      ));

      const numberFields = [
        'gpaCreditHours', 'creditHoursAttempted', 'creditHoursEarned', 'creditHoursPassed',
      ];
      _.each(attributes.gpa, (gpaLevel) => {
        expect(gpaLevel).to.have.all.keys(_.keys(getDefinitionProps('GradePointAverage')));
        expectNumberFields(gpaLevel, numberFields);
      });
    });
  });
  it('test serializeClassification', () => {
    const { serializeClassification } = studentsSerializer;
    const { rawClassification } = testData;
    const resourceType = 'classification';

    const serializedClassification = serializeClassification(rawClassification, fakeId);
    testSingleResource(serializedClassification, resourceType);
  });
  it('test serializeGrades', () => {
    const { serializeGrades } = studentsSerializer;
    const { rawGrades } = testData;
    const resourceType = 'grades';

    const serializedGrades = serializeGrades(rawGrades, fakeId);
    const serializedGradesData = testMultipleResources(serializedGrades);

    _.each(serializedGradesData, (resource, index) => {
      const { sfrstcrCourseLevel, tcknCourseLevel } = rawGrades[index];
      expect(resource)
        .to.contain.keys('attributes')
        .and.to.containSubset({
          id: `${fakeId}-${resource.attributes.term}-${resource.attributes.courseReferenceNumber}`,
          type: resourceType,
          links: { self: null },
        });

      const { attributes } = resource;
      expect(attributes).to.have.all.keys(_.keys(
        getDefinitionProps('GradesResult', { dataItem: true }),
      ));
      expectNumberFields(attributes, ['creditHours']);
      expect(attributes.courseLevel).to.equal(sfrstcrCourseLevel || tcknCourseLevel);
    });
  });
  it('test serializeClassSchedule', () => {
    const { serializeClassSchedule } = studentsSerializer;
    const { rawClassSchedule } = testData;
    const resourceType = 'class-schedule';

    const serializedClassSchedule = serializeClassSchedule(rawClassSchedule, fakeId);
    const serializedClassScheduleData = testMultipleResources(serializedClassSchedule);
    const classScheduleAttribute = getDefinitionProps('ClassScheduleResult', { dataItem: true });

    _.each(serializedClassScheduleData, (resource, index) => {
      const { courseTitleLong, courseTitleShort, continuingEducation } = rawClassSchedule[index];
      expect(resource)
        .to.contain.keys('attributes')
        .and.to.containSubset({
          id: `${fakeId}-${resource.attributes.term}-${resource.attributes.courseReferenceNumber}`,
          type: resourceType,
          links: { self: null },
        });

      const { attributes } = resource;
      expect(attributes).to.have.all.keys(_.keys(classScheduleAttribute));
      expectNumberFields(attributes, ['creditHours']);
      expect(attributes.courseTitle).to.equal(courseTitleLong || courseTitleShort);
      expect(attributes.continuingEducation).to.equal(continuingEducation === 'Y');

      const { faculty, meetingTimes } = attributes;

      _.each(faculty, (f) => {
        expect(f).to.have.all.keys(_.keys(classScheduleAttribute.faculty.items.properties));
        expect(f.primary).to.equal(rawClassSchedule[index].facultyPrimary === 'Y');
      });

      const numberFields = ['hoursPerWeek', 'creditHourSession'];
      _.each(meetingTimes, (m) => {
        expect(m).to.have.all.keys(_.keys(classScheduleAttribute.meetingTimes.items.properties));
        expectNumberFields(m, numberFields);
        expect(m.weeklySchedule).to.be.an('array');
        _.each(m.weeklySchedule, (dailySchedule) => {
          expect(dailySchedule).to.be.oneOf(['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su']);
        });
      });
    });
  });
  it('test serializeHolds', () => {
    const { serializeHolds } = studentsSerializer;
    const { rawHolds } = testData;
    const resourceType = 'holds';
    const processesAffectedKeys = [
      'Registration',
      'Transcript',
      'Graduation',
      'Grades',
      'Accounts Receivable',
      'Enrollment Verification',
      'Application',
      'Compliance',
    ];

    const serializedHolds = serializeHolds(rawHolds, fakeId);
    testSingleResource(serializedHolds, resourceType, 'holds');

    const { holds } = serializedHolds.data.attributes;
    _.each(holds, (hold) => {
      expect(hold).to.have.all.keys(_.keys(
        getDefinitionProps('HoldsResult', { dataField: 'holds' }),
      ));
      _.each(hold.processesAffected, (processesAffectedKey) => {
        expect(processesAffectedKey).to.be.oneOf(processesAffectedKeys);
      });
    });
  });
  it('test serializeWorkStudy', () => {
    const { serializeWorkStudy } = studentsSerializer;
    const { rawAwards } = testData;
    const resourceType = 'work-study';

    const serializedWorkStudy = serializeWorkStudy(rawAwards, fakeId);
    testSingleResource(serializedWorkStudy, resourceType, 'awards');

    const { awards } = serializedWorkStudy.data.attributes;
    const numberFields = [
      'offerAmount', 'acceptedAmount', 'paidAmount',
    ];
    _.each(awards, (award) => {
      expect(award).to.have.all.keys(_.keys(
        getDefinitionProps('WorkStudyResult', { dataField: 'awards' }),
      ));
      expectNumberFields(award, numberFields);
    });
  });
  it('test serializeDualEnrollment', () => {
    const { serializeDualEnrollment } = studentsSerializer;
    const { rawDualEnrollment } = testData;
    const resourceType = 'dual-enrollment';

    const serializedDualEnrollment = serializeDualEnrollment(rawDualEnrollment, fakeId);
    const serializedDualEnrollmentData = testMultipleResources(serializedDualEnrollment);

    _.each(serializedDualEnrollmentData, (resource) => {
      expect(resource)
        .to.contain.keys('attributes')
        .and.to.containSubset({
          id: `${fakeId}-${resource.attributes.term}`,
          type: resourceType,
          links: { self: null },
        });

      const { attributes } = resource;
      expect(attributes).to.have.all.keys(_.keys(
        getDefinitionProps('DualEnrollmentResult', { dataItem: true }),
      ));
      expectNumberFields(attributes, ['creditHours']);
    });
  });
  it('test serializeDegrees', () => {
    const { serializeDegrees } = studentsSerializer;
    const { rawDegrees } = testData;
    const resourceType = 'degree';

    const serializedDegrees = serializeDegrees(rawDegrees, fakeId);
    const serializedDegreesData = testMultipleResources(serializedDegrees);

    _.each(serializedDegreesData, (resource) => {
      expect(resource)
        .to.contain.keys('attributes')
        .and.to.containSubset({
          id: `${fakeId}-${resource.attributes.term}-${resource.attributes.programNumber}`,
          type: resourceType,
          links: { self: null },
        });

      const { attributes } = resource;
      expect(attributes).to.have.all.keys(_.keys(
        getDefinitionProps('DegreesResult', { dataItem: true }),
      ));
      expectNumberFields(attributes, ['programNumber']);
      expect(attributes.primaryDegree).to.be.a('boolean');
    });
  });
});
