const appRoot = require('app-root-path');
const _ = require('lodash');
const JSONAPISerializer = require('jsonapi-serializer').Serializer;
const moment = require('moment-timezone');

const { openapi } = appRoot.require('utils/load-openapi');
const { serializerOptions } = appRoot.require('utils/jsonapi');
const { apiBaseUrl, resourcePathLink, paramsLink } = appRoot.require('utils/uri-builder');

/**
 * @summary The function to generate arguments for JSONAPI serializer
 * @function
 * @param {string} osuId 9 digits OSU ID
 * @param {string} resultField result field from OpenAPI file which the serializer should refer to
 * @param {string} resourcePath resource path name for generating top-level self-link
 * @param {boolean} isSingleton a boolean value represents the resource is singleton or not
 * @returns {Object} arguments for JSONAPI serializer
 */
const getSerializerArgs = (osuId, resultField, resourcePath, isSingleton, params) => {
  const resourceData = openapi.definitions[resultField].properties.data;
  const resourceProp = isSingleton ? resourceData.properties : resourceData.items.properties;
  const studentsUrl = resourcePathLink(apiBaseUrl, 'students');
  const resourceUrl = resourcePathLink(resourcePathLink(studentsUrl, osuId), resourcePath);

  const serializerArgs = {
    identifierField: 'identifierField',
    resourceKeys: _.keys(resourceProp.attributes.properties),
    resourcePath: 'student',
    topLevelSelfLink: params && !_.isEmpty(params) ? paramsLink(resourceUrl, params) : resourceUrl,
    enableDataLinks: false,
    resourceType: resourceProp.type.enum[0],
  };
  return serializerArgs;
};

/**
 * @summary Serialize raw data by given serializer arguments
 * @function
 * @param {string} serializerArgs serializer arguments
 * @param {string} rawRows raw data to be serialized
 * @returns {Object} serialized data
 */
const serializeJsonApi = (serializerArgs, rawRows) => new JSONAPISerializer(
  serializerArgs.resourceType,
  serializerOptions(serializerArgs),
).serialize(rawRows);

/**
 * @summary A helper function to convert a four digit string to time format
 * @function
 * @param {string} string 4 digits string represent time, e.g. 0900
 * @returns {string} properly formatted time format, e.g. 09:00:00
 */
const fourDigitToTime = (string) => {
  const validFormat = /^\d{4}$/;
  if (string === null) {
    return null;
  }
  if (!validFormat.test(string)) {
    return 'Incorrect time format';
  }
  return `${string.substring(0, 2)}:${string.substring(2, 4)}:00`;
};

/**
 * @summary A function to serialize raw GPA data
 * @function
 */
const serializeGpa = (rawGpaLevels, osuId) => {
  const serializerArgs = getSerializerArgs(osuId, 'GradePointAverageResult', 'gpa', true);
  const identifierField = osuId;

  _.forEach(rawGpaLevels, (rawGpaLevel) => {
    const floatFields = [
      'gpaCreditHours', 'creditHoursAttempted', 'creditHoursEarned', 'creditHoursPassed',
    ];
    _.forEach(floatFields, (floatField) => {
      rawGpaLevel[floatField] = parseFloat(rawGpaLevel[floatField]);
    });
  });
  const rawGpas = { identifierField, gpaLevels: rawGpaLevels };

  return serializeJsonApi(serializerArgs, rawGpas);
};

/**
 * @summary A function to serialize raw account balance data
 * @function
 */
const serializeAccountBalance = (rawAccountBalance, osuId) => {
  const serializerArgs = getSerializerArgs(osuId, 'AccountBalanceResult', 'account-balance', true);

  rawAccountBalance.currentBalance = parseFloat(rawAccountBalance.currentBalance);

  return serializeJsonApi(serializerArgs, rawAccountBalance);
};

/**
 * @summary A function to serialize raw account transactions data
 * @function
 */
const serializeAccountTransactions = (rawTransactions, osuId) => {
  const serializerArgs = getSerializerArgs(osuId, 'AccountTransactionsResult', 'account-transactions', true);
  const identifierField = osuId;

  _.forEach(rawTransactions, (rawTransaction) => {
    const rawEntryDate = rawTransaction.entryDate;
    rawTransaction.amount = parseFloat(rawTransaction.amount);
    rawTransaction.entryDate = moment.tz(rawEntryDate, 'PST8PDT').utc().format();
  });

  const rawAccountTransactions = { identifierField, transactions: rawTransactions };

  return serializeJsonApi(serializerArgs, rawAccountTransactions);
};

/**
 * @summary A function to serialize raw academic status data
 * @function
 */
const serializeAcademicStatus = (rawAcademicStatus, osuId, params) => {
  const serializerArgs = getSerializerArgs(osuId, 'AcademicStatusResult', 'academic-status', false, params);

  const rawDataByTerm = {};
  const termsGpa = {};

  _.forEach(rawAcademicStatus, (rawRow) => {
    const rawGpa = {
      gpa: rawRow.gpa,
      gpaCreditHours: parseFloat(rawRow.gpaCreditHours),
      gpaType: rawRow.gpaType,
      creditHoursAttempted: parseFloat(rawRow.creditHoursAttempted),
      creditHoursEarned: parseFloat(rawRow.creditHoursEarned),
      creditHoursPassed: parseFloat(rawRow.creditHoursPassed),
      level: rawRow.level,
      qualityPoints: rawRow.qualityPoints,
    };

    const termGpa = _.defaultTo(termsGpa[rawRow.term], []);
    termsGpa[rawRow.term] = rawRow.gpa ? termGpa.concat(rawGpa) : termGpa;
  });

  _.forEach(rawAcademicStatus, (rawRow) => {
    rawDataByTerm[rawRow.term] = {
      identifierField: `${osuId}-${rawRow.term}`,
      academicStanding: rawRow.academicStanding,
      term: rawRow.term,
      termDescription: rawRow.termDescription,
      gpa: termsGpa[rawRow.term],
    };
  });

  const newRawAcademicStatus = [];
  _.forEach(rawDataByTerm, (rawData) => {
    newRawAcademicStatus.push(rawData);
  });

  return serializeJsonApi(serializerArgs, newRawAcademicStatus);
};

/**
 * @summary A function to serialize raw classification data
 * @function
 */
const serializeClassification = (rawClassification, osuId) => {
  const serializerArgs = getSerializerArgs(osuId, 'ClassificationResult', 'classification', true);

  return serializeJsonApi(serializerArgs, rawClassification);
};

const serializeGrades = (rawGrades, osuId, params) => {
  const serializerArgs = getSerializerArgs(osuId, 'GradesResult', 'grades', false, params);

  _.forEach(rawGrades, (rawGrade) => {
    rawGrade.creditHours = parseFloat(rawGrade.creditHours);
    rawGrade.courseLevel = rawGrade.sfrstcrCourseLevel || rawGrade.tcknCourseLevel;
  });

  return serializeJsonApi(serializerArgs, rawGrades);
};

/**
 * @summary A function to serialize raw class schedule data
 * @function
 */
const serializeClassSchedule = (rawClassSchedule, osuId, params) => {
  const serializerArgs = getSerializerArgs(osuId, 'ClassScheduleResult', 'class-schedule', false, params);
  const rawDataByTermAndCrn = {};

  _.forEach(rawClassSchedule, (rawRow) => {
    const id = `${osuId}-${rawRow.term}-${rawRow.courseReferenceNumber}`;

    rawDataByTermAndCrn[id] = rawDataByTermAndCrn[id] || { faculty: [], meetingTimes: [] };

    const faculty = {
      osuID: rawRow.facultyOsuId,
      name: rawRow.facultyName,
      email: rawRow.facultyEmail,
      primary: rawRow.facultyPrimary === 'Y',
    };

    const meetingTime = {
      beginDate: rawRow.beginDate,
      beginTime: fourDigitToTime(rawRow.beginTime),
      endDate: rawRow.endDate,
      endTime: fourDigitToTime(rawRow.endTime),
      room: rawRow.room,
      building: rawRow.building,
      buildingDescription: rawRow.buildingDescription,
      campus: rawRow.campus,
      hoursPerWeek: parseFloat(rawRow.hoursPerWeek),
      creditHourSession: parseFloat(rawRow.creditHourSession),
      scheduleType: rawRow.meetingScheduleType,
      scheduleDescription: rawRow.meetingScheduleDescription,
      weeklySchedule: _.without([
        rawRow.monday ? 'M' : null,
        rawRow.tuesday ? 'T' : null,
        rawRow.wednesday ? 'W' : null,
        rawRow.thursday ? 'Th' : null,
        rawRow.friday ? 'F' : null,
        rawRow.saturday ? 'Sa' : null,
        rawRow.sunday ? 'Su' : null,
      ], null),
    };

    rawDataByTermAndCrn[id] = {
      identifierField: id,
      academicYear: rawRow.academicYear,
      academicYearDescription: rawRow.academicYearDescription,
      courseReferenceNumber: rawRow.courseReferenceNumber,
      courseSubject: rawRow.courseSubject,
      courseSubjectDescription: rawRow.courseSubjectDescription,
      courseNumber: rawRow.courseNumber,
      courseTitle: rawRow.courseTitleLong || rawRow.courseTitleShort,
      sectionNumber: rawRow.sectionNumber,
      term: rawRow.term,
      termDescription: rawRow.termDescription,
      scheduleDescription: rawRow.scheduleDescription,
      scheduleType: rawRow.scheduleType,
      creditHours: parseFloat(rawRow.creditHours),
      registrationStatus: rawRow.registrationStatus,
      gradingMode: rawRow.gradingMode,
      continuingEducation: rawRow.continuingEducation === 'Y',
      faculty: _.unionWith(rawDataByTermAndCrn[id].faculty, [faculty], _.isEqual),
      meetingTimes: _.unionWith(rawDataByTermAndCrn[id].meetingTimes, [meetingTime], _.isEqual),
    };
  });

  const newClassSchedule = [];
  _.forEach(rawDataByTermAndCrn, (rawData) => {
    newClassSchedule.push(rawData);
  });

  return serializeJsonApi(serializerArgs, newClassSchedule);
};

/**
 * @summary A function to serialize raw holds data
 * @function
 */
const serializeHolds = (rawHolds, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'HoldsResult', 'holds', true);
  const identifierField = osuID;

  _.forEach(rawHolds, (rawHold) => {
    rawHold.webDisplay = rawHold.webDisplay === 'Y';
    const processesAffectedKeys = [
      'registration',
      'transcript',
      'graduation',
      'grades',
      'accountsReceivable',
      'enrollmentVerification',
      'application',
      'compliance',
    ];
    rawHold.processesAffected = _.without(processesAffectedKeys.map(key => rawHold[key]), null);
    _.forEach(processesAffectedKeys, key => delete rawHold[key]);
  });

  const holds = { identifierField, holds: rawHolds };

  return serializeJsonApi(serializerArgs, holds);
};

/**
 * @summary A function to serialize raw work study data
 * @function
 */
const serializeWorkStudy = (rawAwards, osuId) => {
  const serializerArgs = getSerializerArgs(osuId, 'WorkStudyResult', 'work-study', true);
  const identifierField = osuId;

  _.forEach(rawAwards, (rawAward) => {
    const floatFields = [
      'offerAmount', 'acceptedAmount', 'paidAmount',
    ];

    _.forEach(floatFields, (floatField) => {
      rawAward[floatField] = parseFloat(rawAward[floatField]);
    });
  });

  const rawWorkStudy = { identifierField, awards: rawAwards };

  return serializeJsonApi(serializerArgs, rawWorkStudy);
};

/**
 * @summary A function to serialize raw dual enrollment data
 * @function
 */
const serializeDualEnrollment = (rawDualEnrollment, osuId, params) => {
  const serializerArgs = getSerializerArgs(osuId, 'DualEnrollmentResult', 'dual-enrollment', false, params);

  _.forEach(rawDualEnrollment, (rawRow) => {
    rawRow.creditHours = parseFloat(rawRow.creditHours);
  });

  return serializeJsonApi(serializerArgs, rawDualEnrollment);
};

module.exports = {
  fourDigitToTime,
  getSerializerArgs,
  serializeGpa,
  serializeAccountBalance,
  serializeAccountTransactions,
  serializeAcademicStatus,
  serializeClassification,
  serializeGrades,
  serializeClassSchedule,
  serializeHolds,
  serializeWorkStudy,
  serializeDualEnrollment,
};
