const appRoot = require('app-root-path');
const _ = require('lodash');
const JSONAPISerializer = require('jsonapi-serializer').Serializer;
const moment = require('moment-timezone');

const { serializerOptions } = appRoot.require('utils/jsonapi');
const { openapi } = appRoot.require('utils/load-openapi');
const { idSelfLink, subresourceLink } = appRoot.require('utils/uri-builder');

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

const uniqConcat = (array, newItem) => _.uniqWith(array.concat(newItem), _.isEqual);

const fourDigitToTime = (string) => {
  if (string.length !== 4) {
    return 'Incorrect time format';
  }
  return `${string.substring(0, 2)}:${string.substring(2, 4)}:00`;
};

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

  return new JSONAPISerializer(
    serializerArgs.resourceType,
    serializerOptions(serializerArgs),
  ).serialize(rawGPAs);
};

const serializeAccountBalance = (rawAccountBalance, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'AccountBalanceResult', 'account-balance', true);

  rawAccountBalance.currentBalance = parseFloat(rawAccountBalance.currentBalance);

  return new JSONAPISerializer(
    serializerArgs.resourceType,
    serializerOptions(serializerArgs),
  ).serialize(rawAccountBalance);
};

const serializeAccountTransactions = (rawTransactions, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'AccountTransactionsResult', 'account-transactions', true);
  const identifierField = osuID;

  _.forEach(rawTransactions, (rawTransaction) => {
    const rawEntryDate = rawTransaction.entryDate;
    rawTransaction.amount = parseFloat(rawTransaction.amount);
    rawTransaction.entryDate = moment.tz(rawEntryDate, 'PST8PDT').utc().format();
  });

  const rawAccountTransactions = { identifierField, transactions: rawTransactions };

  return new JSONAPISerializer(
    serializerArgs.resourceType,
    serializerOptions(serializerArgs),
  ).serialize(rawAccountTransactions);
};

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

  return new JSONAPISerializer(
    serializerArgs.resourceType,
    serializerOptions(serializerArgs),
  ).serialize(newRawAcademicStatus);
};

const serializeClassification = (rawClassification, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'ClassificationResult', 'classification', true);

  return new JSONAPISerializer(
    serializerArgs.resourceType,
    serializerOptions(serializerArgs),
  ).serialize(rawClassification);
};

const serializeGrades = (rawGrades, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'GradesResult', 'grades', false);

  _.forEach(rawGrades, (rawGrade) => {
    rawGrade.creditHours = parseFloat(rawGrade.creditHours);
  });

  return new JSONAPISerializer(
    serializerArgs.resourceType,
    serializerOptions(serializerArgs),
  ).serialize(rawGrades);
};

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
      faculty: uniqConcat(rawDataByTermAndCRN[id].faculty, faculty),
      meetingTimes: uniqConcat(rawDataByTermAndCRN[id].meetingTimes, meetingTime),
    };
  });

  const newClassSchedule = [];
  _.forEach(rawDataByTermAndCRN, (rawData) => {
    newClassSchedule.push(rawData);
  });

  return new JSONAPISerializer(
    serializerArgs.resourceType,
    serializerOptions(serializerArgs),
  ).serialize(newClassSchedule);
};

module.exports = {
  serializeGPA,
  serializeAccountBalance,
  serializeAccountTransactions,
  serializeAcademicStatus,
  serializeClassification,
  serializeGrades,
  serializeClassSchedule,
};
