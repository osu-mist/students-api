/* eslint no-unused-expressions: 0 */

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
const { expect } = chai;

describe('Test students-serializer', () => {
  const fakeId = 'fakeId';
  const fakeBaseUrl = `/v1/students/${fakeId}`;
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

  it('test fourDigitToTime', () => {
    const { fourDigitToTime } = studentsSerializer;
    expect(fourDigitToTime(null)).to.be.null;

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
      expect(actualArgs).to.deep.equal(expectedArgs);
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
      .to.containSubset(resourceSubsetSchema(resourceType))
      .and.to.have.nested.property('data.attributes.gpaLevels');

    const floatFields = [
      'gpaCreditHours', 'creditHoursAttempted', 'creditHoursEarned', 'creditHoursPassed',
    ];
    const { gpaLevels } = serializedGpaLevels.data.attributes;
    _.each(gpaLevels, (gpaLevel) => {
      expect(gpaLevel).to.have.all.keys(_.keys(openapi.definitions.GradePointAverage.properties));
      _.each(floatFields, (floatField) => {
        expect(gpaLevel[floatField]).to.be.a('number');
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
      .to.containSubset(resourceSubsetSchema(resourceType, { currentBalance: 99.99 }));
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
      .to.containSubset(resourceSubsetSchema(resourceType))
      .and.to.have.nested.property('data.attributes.transactions');

    const { transactions } = serializedTransactions.data.attributes;
    _.each(transactions, (transaction) => {
      expect(transaction).to.have.all.keys(_.keys(
        openapi.definitions.AccountTransactionsResult.properties
          .data.properties.attributes.properties.transactions.items.properties,
      ));
      expect(Date.parse(transaction.entryDate)).to.not.be.NaN;
      expect(transaction.amount).to.be.a('number');
    });
  });
  it('test serializeAcademicStatus', () => {
    const { serializeAcademicStatus } = studentsSerializer;
    const resourceType = 'academic-status';
    const rawAcademicStatus = [
      {
        academicStanding: 'Good Standing',
        term: '201803',
        termDescription: 'Spring 2018',
        gpa: '4.00',
        gpaCreditHours: '14',
        gpaType: 'Institution',
        creditHoursAttempted: '14',
        creditHoursEarned: '14',
        creditHoursPassed: '14',
        level: 'Undergraduate',
        qualityPoints: '56.00',
      },
      {
        academicStanding: 'Good Standing',
        term: '201901',
        termDescription: 'Fall 2018',
        gpa: '4.00',
        gpaCreditHours: '15',
        gpaType: 'Institution',
        creditHoursAttempted: '16',
        creditHoursEarned: '16',
        creditHoursPassed: '16',
        level: 'Undergraduate',
        qualityPoints: '60.00',
      },
    ];

    const serializedAcademicStatus = serializeAcademicStatus(rawAcademicStatus, fakeId);
    const serializedAcademicStatusData = serializedAcademicStatus.data;
    expect(serializedAcademicStatus).to.have.keys('data', 'links');
    expect(serializedAcademicStatusData).to.be.an('array');

    _.each(serializedAcademicStatusData, (resource) => {
      expect(resource)
        .to.contains.keys('attributes')
        .and.to.containSubset({
          id: `${fakeId}-${resource.attributes.term}`,
          type: resourceType,
          links: { self: null },
        });

      const { attributes } = resource;
      expect(attributes).to.have.all.keys(_.keys(
        openapi.definitions.AcademicStatusResult.properties
          .data.items.properties.attributes.properties,
      ));

      _.each(attributes.gpa, (gpaLevel) => {
        expect(gpaLevel).to.have.all.keys(_.keys(openapi.definitions.GradePointAverage.properties));
        const floatFields = [
          'gpaCreditHours', 'creditHoursAttempted', 'creditHoursEarned', 'creditHoursPassed',
        ];
        _.each(floatFields, (floatField) => {
          expect(gpaLevel[floatField]).to.be.a('number');
        });
      });
    });
  });
  it('test serializeClassification', () => {
    const { serializeClassification } = studentsSerializer;
    const resourceType = 'classification';
    const rawClassification = {
      identifierField: fakeId,
      level: 'Graduate',
      classification: 'Determine from Student Type',
    };

    const serializedClassification = serializeClassification(rawClassification, fakeId);
    expect(serializedClassification)
      .to.containSubset(resourceSubsetSchema(resourceType));
  });
  it('test serializeGrades', () => {
    const { serializeGrades } = studentsSerializer;
    const resourceType = 'grades';
    const rawGrades = [
      {
        identifierField: `${fakeId}-200803-37626`,
        courseReferenceNumber: '37626',
        gradeFinal: 'A',
        courseSubject: 'SPAN',
        courseSubjectDescription: 'Spanish',
        courseNumber: '336',
        courseTitle: '*LATIN AMERICAN CULTURE',
        sectionNumber: '001',
        term: '200803',
        termDescription: 'Spring 2008',
        scheduleType: 'A',
        scheduleDescription: 'Lecture',
        creditHours: '3',
        tcknCourseLevel: 'Non-Degree / Credential',
        sfrstcrCourseLevel: null,
        registrationStatus: null,
        gradeMode: 'N',
        gradeModeDescription: 'Normal Grading Mode',
      },
      {
        identifierField: `${fakeId}-201900-72004`,
        courseReferenceNumber: '72004',
        gradeFinal: 'B',
        courseSubject: 'FW',
        courseSubjectDescription: 'Fisheries and Wildlife',
        courseNumber: '427',
        courseTitle: 'PRINCIPLES OF WILDLIFE DISEASE',
        sectionNumber: '400',
        term: '201900',
        termDescription: 'Summer 2018',
        scheduleType: 'Y',
        scheduleDescription: 'Online',
        creditHours: '4',
        tcknCourseLevel: 'Undergraduate',
        sfrstcrCourseLevel: 'E-Campus Undergraduate Course',
        registrationStatus: '**Web Registered**',
        gradeMode: 'N',
        gradeModeDescription: 'Normal Grading Mode',
      },
    ];

    const serializedGrades = serializeGrades(rawGrades, fakeId);
    const serializedGradesData = serializedGrades.data;
    expect(serializedGrades).to.have.keys('data', 'links');
    expect(serializedGradesData).to.be.an('array');

    let index = 0;
    _.each(serializedGradesData, (resource) => {
      const { sfrstcrCourseLevel, tcknCourseLevel } = rawGrades[index];
      expect(resource)
        .to.contains.keys('attributes')
        .and.to.containSubset({
          id: `${fakeId}-${resource.attributes.term}-${resource.attributes.courseReferenceNumber}`,
          type: resourceType,
          links: { self: null },
        });

      const { attributes } = resource;
      expect(attributes).to.have.all.keys(_.keys(
        openapi.definitions.GradesResult.properties
          .data.items.properties.attributes.properties,
      ));
      expect(attributes.creditHours).to.be.a('number');
      expect(attributes.courseLevel).to.equal(sfrstcrCourseLevel || tcknCourseLevel);
      index += 1;
    });
  });
  it('test serializeClassSchedule', () => {
    const { serializeClassSchedule } = studentsSerializer;
    const resourceType = 'class-schedule';
    const rawClassSchedule = [
      {
        academicYear: '0405',
        academicYearDescription: 'Academic Year 2004-05',
        courseReferenceNumber: '37430',
        courseSubject: 'RNG',
        courseSubjectDescription: 'Rangeland Ecology & Management',
        courseNumber: '399',
        courseTitleShort: 'SPECIAL TOPICS',
        courseTitleLong: null,
        sectionNumber: '001',
        term: '200503',
        termDescription: 'Spring 2005',
        scheduleType: 'F',
        scheduleDescription: 'Independent or Special Studies',
        creditHours: '2',
        registrationStatus: '**Web Registered**',
        gradingMode: 'Normal Grading Mode',
        continuingEducation: null,
        facultyOsuId: '930608969',
        facultyName: 'Ehrhart, Robert',
        facultyEmail: 'Bob.Ehrhart@oregonstate.edu',
        facultyPrimary: 'Y',
        beginDate: '2005-03-28',
        beginTime: null,
        endDate: '2005-06-03',
        endTime: null,
        room: null,
        building: null,
        buildingDescription: null,
        campus: 'Oregon State - Cascades',
        hoursPerWeek: '0',
        creditHourSession: '2',
        meetingScheduleType: 'F',
        meetingScheduleDescription: 'Independent or Special Studies',
        monday: null,
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
        sunday: null,
      },
      {
        academicYear: '0405',
        academicYearDescription: 'Academic Year 2004-05',
        courseReferenceNumber: '35301',
        courseSubject: 'BIO',
        courseSubjectDescription: 'Biology-UO',
        courseNumber: '370-U',
        courseTitleShort: 'UO. ECOLOGY',
        courseTitleLong: null,
        sectionNumber: '001',
        term: '200503',
        termDescription: 'Spring 2005',
        scheduleType: 'A',
        scheduleDescription: 'Lecture',
        creditHours: '4',
        registrationStatus: '**Web Registered**',
        gradingMode: 'Normal Grading Mode',
        continuingEducation: null,
        facultyOsuId: '930828000',
        facultyName: 'Clark, Lisa',
        facultyEmail: null,
        facultyPrimary: 'Y',
        beginDate: '2005-03-28',
        beginTime: '1900',
        endDate: '2005-06-03',
        endTime: '2030',
        room: '201',
        building: 'CSB',
        buildingDescription: 'Cascades Hall (COOSU)',
        campus: 'Oregon State - Cascades',
        hoursPerWeek: '3',
        creditHourSession: '4',
        meetingScheduleType: 'A',
        meetingScheduleDescription: 'Lecture',
        monday: null,
        tuesday: 'T',
        wednesday: null,
        thursday: 'R',
        friday: null,
        saturday: null,
        sunday: null,
      },
    ];
    const serializedClassSchedule = serializeClassSchedule(rawClassSchedule, fakeId);
    const serializedClassScheduleData = serializedClassSchedule.data;
    const classScheduleAttribute = openapi
      .definitions.ClassScheduleResult.properties.data.items.properties.attributes.properties;

    expect(serializedClassSchedule).to.have.keys('data', 'links');
    expect(serializedClassScheduleData).to.be.an('array');

    let index = 0;
    _.each(serializedClassScheduleData, (resource) => {
      const { courseTitleLong, courseTitleShort, continuingEducation } = rawClassSchedule[index];
      expect(resource)
        .to.contains.keys('attributes')
        .and.to.containSubset({
          id: `${fakeId}-${resource.attributes.term}-${resource.attributes.courseReferenceNumber}`,
          type: resourceType,
          links: { self: null },
        });

      const { attributes } = resource;
      expect(attributes).to.have.all.keys(_.keys(classScheduleAttribute));
      expect(attributes.creditHours).to.be.a('number');
      expect(attributes.courseTitle).to.equal(courseTitleLong || courseTitleShort);
      expect(attributes.continuingEducation).to.equal(continuingEducation === 'Y');

      const { faculty, meetingTimes } = attributes;

      _.each(faculty, (f) => {
        expect(f).to.have.all.keys(_.keys(classScheduleAttribute.faculty.items.properties));
        expect(f.primary).to.equal(rawClassSchedule[index].facultyPrimary === 'Y');
      });

      _.each(meetingTimes, (m) => {
        expect(m).to.have.all.keys(_.keys(classScheduleAttribute.meetingTimes.items.properties));

        const floatFields = ['hoursPerWeek', 'creditHourSession'];
        _.each(floatFields, (floatField) => {
          expect(m[floatField]).to.be.a('number');
        });
        expect(m.weeklySchedule).to.be.an('array');
        _.each(m.weeklySchedule, (dailySchedule) => {
          expect(dailySchedule).to.be.oneOf(['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su']);
        });
      });
      index += 1;
    });
  });
  it('test serializeHolds', () => {
    const { serializeHolds } = studentsSerializer;
    const resourceType = 'holds';
    const rawHolds = [
      {
        fromDate: '2011-12-28',
        toDate: '2099-12-31',
        reason: 'ACTG 321',
        description: 'Missing Requirements',
        registration: null,
        transcript: null,
        graduation: 'Graduation',
        grades: null,
        accountsReceivable: null,
        enrollmentVerification: null,
        application: null,
        compliance: null,
      },
      {
        fromDate: '2011-12-28',
        toDate: '2099-12-31',
        reason: 'Has not applied as Postbac',
        description: 'Must Apply as Postbac',
        registration: 'Registration',
        transcript: null,
        graduation: 'Graduation',
        grades: null,
        accountsReceivable: null,
        enrollmentVerification: null,
        application: null,
        compliance: null,
      },
    ];
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
    expect(serializedHolds)
      .to.containSubset(resourceSubsetSchema(resourceType))
      .and.to.have.nested.property('data.attributes.holds');

    const { holds } = serializedHolds.data.attributes;
    _.each(holds, (hold) => {
      expect(hold).to.have.all.keys(_.keys(
        openapi.definitions.HoldsResult.properties.data
          .properties.attributes.properties.holds.items.properties,
      ));
      _.each(hold.processesAffected, (processesAffectedKey) => {
        expect(processesAffectedKey).to.be.oneOf(processesAffectedKeys);
      });
    });
  });
  it('test serializeWorkStudy', () => {
    const { serializeWorkStudy } = studentsSerializer;
    const resourceType = 'work-study';
    const rawAwards = [
      {
        offerAmount: '1500',
        offerExpirationDate: '2006-06-09',
        acceptedAmount: '1500',
        acceptedDate: '2006-05-12',
        paidAmount: '0',
        awardStatus: 'Accepted',
        effectiveStartDate: '2006-09-25',
        effectiveEndDate: '2007-06-15',
      },
      {
        offerAmount: '0',
        offerExpirationDate: null,
        acceptedAmount: '0',
        acceptedDate: null,
        paidAmount: '0',
        awardStatus: 'Cancelled',
        effectiveStartDate: '2007-06-25',
        effectiveEndDate: '2008-03-21',
      },
    ];

    const serializedWorkStudy = serializeWorkStudy(rawAwards, fakeId);
    expect(serializedWorkStudy)
      .to.containSubset(resourceSubsetSchema(resourceType))
      .and.to.have.nested.property('data.attributes.awards');

    const { awards } = serializedWorkStudy.data.attributes;
    _.each(awards, (award) => {
      expect(award).to.have.all.keys(_.keys(
        openapi.definitions.WorkStudyResult.properties.data
          .properties.attributes.properties.awards.items.properties,
      ));
      const floatFields = [
        'offerAmount', 'acceptedAmount', 'paidAmount',
      ];
      _.each(floatFields, (floatField) => {
        expect(award[floatField]).to.be.a('number');
      });
    });
  });
});
