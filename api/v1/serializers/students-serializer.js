const appRoot = require('app-root-path');
const _ = require('lodash');
const JSONAPISerializer = require('jsonapi-serializer').Serializer;
const moment = require('moment-timezone');

const { openapi } = appRoot.require('utils/load-openapi');
const { serializerOptions } = appRoot.require('utils/jsonapi');
const { idSelfLink, subresourceLink } = appRoot.require('utils/uri-builder');

/**
 * @summary The function to generate arguments for JSONAPI serializer
 * @function
 * @param {string} osuID 9 digits OSU ID
 * @param {string} resultField result field from OpenAPI file which the serializer should refer to
 * @param {string} resourcePath resource path name for generating top-level self-link
 * @param {boolean} isSingleton a boolean value represents the resource is singleton or not
 * @returns {Object} arguments for JSONAPI serializer
 */
const getSerializerArgs = (osuID, resultField, resourcePath, isSingleton) => {
  const resourceData = openapi.definitions[resultField].properties.data;
  const resourceProp = isSingleton ? resourceData.properties : resourceData.items.properties;
  const serializerArgs = {
    identifierField: 'identifierField',
    resourceKeys: _.keys(resourceProp.attributes.properties),
    resourcePath: 'student',
    topLevelSelfLink: subresourceLink(idSelfLink(osuID, 'students'), resourcePath),
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
const serializeJSONAPI = (serializerArgs, rawRows) => new JSONAPISerializer(
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
  if (string === null) {
    return null;
  }
  if (string.length !== 4) {
    return 'Incorrect time format';
  }
  return `${string.substring(0, 2)}:${string.substring(2, 4)}:00`;
};

/**
 * @summary A function to serialize raw GPA data
 * @function
 */
const serializeGPA = (rawGPALevels, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'GradePointAverageResult', 'gpa', true);
  const identifierField = osuID;

  _.forEach(rawGPALevels, (rawGPALevel) => {
    const floatFields = [
      'gpaCreditHours', 'creditHoursAttempted', 'creditHoursEarned', 'creditHoursPassed',
    ];
    _.forEach(floatFields, (floatField) => {
      rawGPALevel[floatField] = parseFloat(rawGPALevel[floatField]);
    });
  });
  const rawGPAs = { identifierField, gpaLevels: rawGPALevels };

  return serializeJSONAPI(serializerArgs, rawGPAs);
};

/**
 * @summary A function to serialize raw account balance data
 * @function
 */
const serializeAccountBalance = (rawAccountBalance, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'AccountBalanceResult', 'account-balance', true);

  rawAccountBalance.currentBalance = parseFloat(rawAccountBalance.currentBalance);

  return serializeJSONAPI(serializerArgs, rawAccountBalance);
};

/**
 * @summary A function to serialize raw account transactions data
 * @function
 */
const serializeAccountTransactions = (rawTransactions, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'AccountTransactionsResult', 'account-transactions', true);
  const identifierField = osuID;

  _.forEach(rawTransactions, (rawTransaction) => {
    const rawEntryDate = rawTransaction.entryDate;
    rawTransaction.amount = parseFloat(rawTransaction.amount);
    rawTransaction.entryDate = moment.tz(rawEntryDate, 'PST8PDT').utc().format();
  });

  const rawAccountTransactions = { identifierField, transactions: rawTransactions };

  return serializeJSONAPI(serializerArgs, rawAccountTransactions);
};

/**
 * @summary A function to serialize raw academic status data
 * @function
 */
const serializeAcademicStatus = (rawAcademicStatus, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'AcademicStatusResult', 'academic-status', false);

  const rawDataByTerm = {};
  const termGPA = {};

  _.forEach(rawAcademicStatus, (rawRow) => {
    const rawGPA = {
      gpa: rawRow.gpa,
      gpaCreditHours: parseFloat(rawRow.gpaCreditHours),
      gpaType: rawRow.gpaType,
      creditHoursAttempted: parseFloat(rawRow.creditHoursAttempted),
      creditHoursEarned: parseFloat(rawRow.creditHoursEarned),
      creditHoursPassed: parseFloat(rawRow.creditHoursPassed),
      level: rawRow.level,
      qualityPoints: rawRow.qualityPoints,
    };
    termGPA[rawRow.term] = _.defaultTo(termGPA[rawRow.term], []).concat(rawGPA);
  });

  _.forEach(rawAcademicStatus, (rawRow) => {
    rawDataByTerm[rawRow.term] = {
      identifierField: `${osuID}-${rawRow.term}`,
      academicStanding: rawRow.academicStanding,
      term: rawRow.term,
      termDescription: rawRow.termDescription,
      gpa: termGPA[rawRow.term],
    };
  });

  const newRawAcademicStatus = [];
  _.forEach(rawDataByTerm, (rawData) => {
    newRawAcademicStatus.push(rawData);
  });

  return serializeJSONAPI(serializerArgs, newRawAcademicStatus);
};

/**
 * @summary A function to serialize raw classification data
 * @function
 */
const serializeClassification = (rawClassification, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'ClassificationResult', 'classification', true);

  return serializeJSONAPI(serializerArgs, rawClassification);
};

const serializeGrades = (rawGrades, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'GradesResult', 'grades', false);

  _.forEach(rawGrades, (rawGrade) => {
    rawGrade.creditHours = parseFloat(rawGrade.creditHours);
  });

  return serializeJSONAPI(serializerArgs, rawGrades);
};

/**
 * @summary A function to serialize raw class schedule data
 * @function
 */
const serializeClassSchedule = (rawClassSchedule, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'ClassScheduleResult', 'class-schedule', false);
  const rawDataByTermAndCRN = {};

  _.forEach(rawClassSchedule, (rawRow) => {
    const id = `${osuID}-${rawRow.term}-${rawRow.courseReferenceNumber}`;

    rawDataByTermAndCRN[id] = rawDataByTermAndCRN[id] || { faculty: [], meetingTimes: [] };

    const faculty = {
      osuID: rawRow.facultyOSUID,
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

    rawDataByTermAndCRN[id] = {
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
      faculty: _.unionWith(rawDataByTermAndCRN[id].faculty, [faculty], _.isEqual),
      meetingTimes: _.unionWith(rawDataByTermAndCRN[id].meetingTimes, [meetingTime], _.isEqual),
    };
  });

  const newClassSchedule = [];
  _.forEach(rawDataByTermAndCRN, (rawData) => {
    newClassSchedule.push(rawData);
  });

  return serializeJSONAPI(serializerArgs, newClassSchedule);
};

/**
 * @summary A function to serialize raw holds data
 * @function
 */
const serializeHolds = (rawHolds, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'HoldsResult', 'holds', true);
  const identifierField = osuID;

  _.forEach(rawHolds, (rawHold) => {
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

  return serializeJSONAPI(serializerArgs, holds);
};

/**
 * @summary A function to serialize raw work study data
 * @function
 */
const serializeWorkStudy = (rawAwards, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'WorkStudyResult', 'work-study', true);
  const identifierField = osuID;

  _.forEach(rawAwards, (rawAward) => {
    const floatFields = [
      'offerAmount', 'acceptedAmount', 'paidAmount',
    ];

    _.forEach(floatFields, (floatField) => {
      rawAward[floatField] = parseFloat(rawAward[floatField]);
    });
  });

  const rawWorkStudy = { identifierField, awards: rawAwards };

  return serializeJSONAPI(serializerArgs, rawWorkStudy);
};

/**
 * @summary A function to serialize raw dual enrollment data
 * @function
 */
const serializeDualEnrollment = (rawDualEnrollment, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'DualEnrollmentResult', 'dual-enrollment', false);

  _.forEach(rawDualEnrollment, (rawRow) => {
    rawRow.creditHours = parseFloat(rawRow.creditHours);
  });

  return serializeJSONAPI(serializerArgs, rawDualEnrollment);
};

module.exports = {
  serializeGPA,
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
