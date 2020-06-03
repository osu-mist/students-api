import _ from 'lodash';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import moment from 'moment-timezone';

import { openapi } from 'utils/load-openapi';
import { serializerOptions } from 'utils/jsonapi';
import { apiBaseUrl, resourcePathLink, paramsLink } from 'utils/uri-builder';

/**
 * The function to generate arguments for JSONAPI serializer
 *
 * @param {string} osuId 9 digits OSU ID
 * @param {string} resultField result field from OpenAPI file which the serializer should refer to
 * @param {string} resourcePath resource path name for generating top-level self-link
 * @param {boolean} isSingleton a boolean value represents the resource is singleton or not
 * @param {object} params query parameters
 * @returns {object} arguments for JSONAPI serializer
 */
const getSerializerArgs = (osuId, resultField, resourcePath, isSingleton, params) => {
  const resourceData = openapi.definitions[resultField].properties.data;
  const resourceProp = isSingleton ? resourceData.properties : resourceData.items.properties;
  const studentsUrl = resourcePathLink(apiBaseUrl, 'students');
  const resourceUrl = resourcePathLink(resourcePathLink(studentsUrl, osuId), resourcePath);

  params = _.mapValues(params, (val) => (_.isArray(val) ? _.join(val, ',') : val));

  const serializerArgs = {
    identifierField: 'identifierField',
    resourceKeys: _.keys(resourceProp.attributes.properties),
    resourcePath: 'students',
    topLevelSelfLink: params && !_.isEmpty(params) ? paramsLink(resourceUrl, params) : resourceUrl,
    enableDataLinks: false,
    resourceType: resourceProp.type.enum[0],
  };
  return serializerArgs;
};

/**
 * Serialize raw data by given serializer arguments
 *
 * @param {string} serializerArgs serializer arguments
 * @param {string} rawRows raw data to be serialized
 * @returns {object} serialized data
 */
const serializeJsonApi = (serializerArgs, rawRows) => new JSONAPISerializer(
  serializerArgs.resourceType,
  serializerOptions(serializerArgs),
).serialize(rawRows);

/**
 * A helper function to convert a four digit string to time format
 *
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
 * A function to serialize raw GPA data
 *
 * @param {object[]} rawGpaLevels raw GPA level
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized GPA data
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
 * A function to serialize raw account balance data
 *
 * @param {object[]} rawAccountBalance raw account balance
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized account balance data
 */
const serializeAccountBalance = (rawAccountBalance, osuId) => {
  const serializerArgs = getSerializerArgs(osuId, 'AccountBalanceResult', 'account-balance', true);

  rawAccountBalance.currentBalance = parseFloat(rawAccountBalance.currentBalance);

  return serializeJsonApi(serializerArgs, rawAccountBalance);
};

/**
 * A function to serialize raw account transactions data
 *
 * @param {object[]} rawTransactions raw account transaction
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params query parameters
 * @returns {object} serialized account transaction data
 */
const serializeAccountTransactions = (rawTransactions, osuId, params) => {
  const serializerArgs = getSerializerArgs(osuId, 'AccountTransactionsResult', 'account-transactions', true, params);
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
 * A function to serialize raw academic status data
 *
 * @param {object[]} rawAcademicStatus raw academic status
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params query parameters
 * @returns {object} serialized academic status data
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
      levelCode: rawRow.levelCode,
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
 * A function to serialize raw classification data
 *
 * @param {object[]} rawClassification raw classification
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized classification data
 */
const serializeClassification = (rawClassification, osuId) => {
  const serializerArgs = getSerializerArgs(osuId, 'ClassificationResult', 'classification', true);

  rawClassification.isInternational = rawClassification.isInternational === 'Y';

  return serializeJsonApi(serializerArgs, rawClassification);
};

/**
 * A function to serialize raw grade data
 *
 * @param {object[]} rawGrades raw grades
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params query parameters
 * @returns {object} serialized grades data
 */
const serializeGrades = (rawGrades, osuId, params) => {
  const serializerArgs = getSerializerArgs(osuId, 'GradesResult', 'grades', false, params);

  _.forEach(rawGrades, (rawGrade) => {
    rawGrade.creditHours = parseFloat(rawGrade.creditHours);
    rawGrade.courseLevel = rawGrade.sfrstcrCourseLevel || rawGrade.tcknCourseLevel;
  });

  return serializeJsonApi(serializerArgs, rawGrades);
};

/**
 * A function to serialize raw class schedule data
 *
 * @param {object[]} rawClassSchedule raw class schedule
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params query parameters
 * @returns {object} serialized class schedule data
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
      campusCode: rawRow.campusCode,
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
      repeatedCourseInd: rawRow.repeatedCourseInd,
    };
  });

  const newClassSchedule = [];
  _.forEach(rawDataByTermAndCrn, (rawData) => {
    newClassSchedule.push(rawData);
  });

  return serializeJsonApi(serializerArgs, newClassSchedule);
};

/**
 * A function to serialize raw holds data
 *
 * @param {object[]} rawHolds raw holds
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params query parameters
 * @returns {object} serialized holds data
 */
const serializeHolds = (rawHolds, osuId, params) => {
  const serializerArgs = getSerializerArgs(osuId, 'HoldsResult', 'holds', true, params);
  const identifierField = osuId;

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
    rawHold.processesAffected = _.without(processesAffectedKeys.map((key) => rawHold[key]), null);
    _.forEach(processesAffectedKeys, (key) => delete rawHold[key]);
    rawHold.releasedInd = rawHold.releasedInd === 'Y';
  });

  const holds = { identifierField, holds: rawHolds };

  return serializeJsonApi(serializerArgs, holds);
};

/**
 * A function to serialize raw work study data
 *
 * @param {object[]} rawAwards raw awards
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized awards data
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
 * A function to serialize raw dual enrollment data
 *
 * @param {object[]} rawDualEnrollment raw dual enrollment
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params query parameters
 * @returns {object} serialized dual enrollment data
 */
const serializeDualEnrollment = (rawDualEnrollment, osuId, params) => {
  const serializerArgs = getSerializerArgs(osuId, 'DualEnrollmentResult', 'dual-enrollment', false, params);

  _.forEach(rawDualEnrollment, (rawRow) => {
    rawRow.creditHours = parseFloat(rawRow.creditHours);
  });

  return serializeJsonApi(serializerArgs, rawDualEnrollment);
};

/**
 * A function to serialize raw degrees data
 *
 * @param {object[]} rawDegrees raw degrees
 * @param {string} osuId 9 digits OSU ID
 * @param {object} params query parameters
 * @returns {object} serialized degrees data
 */
const serializeDegrees = (rawDegrees, osuId, params) => {
  const serializerArgs = getSerializerArgs(osuId, 'DegreesResult', 'degrees', false, params);

  _.forEach(rawDegrees, (rawDegree) => {
    rawDegree.programNumber = parseFloat(rawDegree.programNumber);
    rawDegree.primaryDegree = rawDegree.primaryDegree === 'Y';
    rawDegree.majors = {
      first: rawDegree.firstMajor ? {
        major: rawDegree.firstMajor,
        programClassification: rawDegree.firstProgramClassification,
        department: rawDegree.firstDepartment,
        firstConcentration: rawDegree.firstMajorFirstConcentration,
        secondConcentration: rawDegree.firstMajorSecondConcentration,
        thirdConcentration: rawDegree.firstMajorThirdConcentration,
      } : null,
      second: rawDegree.secondMajor ? {
        major: rawDegree.secondMajor,
        programClassification: rawDegree.secondProgramClassification,
        department: rawDegree.secondDepartment,
        firstConcentration: rawDegree.secondMajorFirstConcentration,
        secondConcentration: rawDegree.secondMajorSecondConcentration,
        thirdConcentration: rawDegree.secondMajorThirdConcentration,
      } : null,
      third: rawDegree.thirdMajor ? {
        major: rawDegree.thirdMajor,
        programClassification: rawDegree.thirdProgramClassification,
        department: rawDegree.thirdDepartment,
        firstConcentration: rawDegree.thirdMajorFirstConcentration,
        secondConcentration: rawDegree.thirdMajorSecondConcentration,
        thirdConcentration: rawDegree.thirdMajorThirdConcentration,
      } : null,
      fourth: rawDegree.fourthMajor ? {
        major: rawDegree.fourthMajor,
        programClassification: rawDegree.fourthProgramClassification,
        department: rawDegree.fourthDepartment,
        firstConcentration: rawDegree.fourthMajorFirstConcentration,
        secondConcentration: rawDegree.fourthMajorSecondConcentration,
        thirdConcentration: rawDegree.fourthMajorThirdConcentration,
      } : null,
    };
    rawDegree.minors = {
      first: rawDegree.firstMinor,
      second: rawDegree.secondMinor,
      third: rawDegree.thirdMinor,
      fourth: rawDegree.fourthMinor,
    };
    rawDegree.dualDegree = rawDegree.dualDegree ? {
      degree: rawDegree.dualDegree,
      level: rawDegree.dualDegreeLevel,
      college: rawDegree.dualDegreeCollege,
      major: rawDegree.dualDegreeMajor,
      programClassification: rawDegree.dualDegreeProgramClassification,
    } : null;
    rawDegree.honorInd = rawDegree.honorInd === 'Y';
  });

  return serializeJsonApi(serializerArgs, rawDegrees);
};

/**
 * A function to serialize raw emergency contact data
 *
 * @param {object[]} rawEmergencyContacts raw emergency contacts
 * @param {string} osuId 9 digits OSU ID
 * @returns {object} serialized emergency contact data
 */
const serializeEmergencyContacts = (rawEmergencyContacts, osuId) => {
  const serializerArgs = getSerializerArgs(osuId, 'EmergencyContactsResult', 'emergency-contacts', true);
  const identifierField = osuId;

  _.forEach(rawEmergencyContacts, (rawEmergencyContact) => {
    rawEmergencyContact.priority = parseFloat(rawEmergencyContact.priority);
  });

  return serializeJsonApi(serializerArgs, {
    identifierField,
    emergencyContacts: rawEmergencyContacts,
  });
};

export {
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
  serializeDegrees,
  serializeEmergencyContacts,
};
