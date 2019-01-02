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
    identifierField: 'osuID',
    resourceKeys: _.keys(resourceProp.attributes.properties),
    resourcePath: 'student',
    topLevelSelfLink: subresourceLink(idSelfLink(osuID, 'students'), resourcePath),
    subresourcePath: resourcePath,
    resourceType: resourceProp.type.enum[0],
  };
  return serializerArgs;
};

const serializeGPA = (rawGPALevels, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'GradePointAverageResult', 'gpa', true);

  _.forEach(rawGPALevels, (rawGPALevel) => {
    const floatFields = [
      'gpaCreditHours', 'creditHoursAttempted', 'creditHoursEarned', 'creditHoursPassed',
    ];
    _.forEach(floatFields, (floatField) => {
      rawGPALevel[floatField] = parseFloat(rawGPALevel[floatField]);
    });
  });
  const rawGPAs = { osuID, gpaLevels: rawGPALevels };

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

  _.forEach(rawTransactions, (rawTransaction) => {
    const rawEntryDate = rawTransaction.entryDate;
    rawTransaction.amount = parseFloat(rawTransaction.amount);
    rawTransaction.entryDate = moment.tz(rawEntryDate, 'PST8PDT').utc().format();
  });

  const rawAccountTransactions = { osuID, transactions: rawTransactions };

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

module.exports = {
  serializeGPA,
  serializeAccountBalance,
  serializeAccountTransactions,
  serializeAcademicStatus,
};
