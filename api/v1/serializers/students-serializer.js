const appRoot = require('app-root-path');
const _ = require('lodash');
const JSONAPISerializer = require('jsonapi-serializer').Serializer;
const moment = require('moment-timezone');

const { serializerOptions } = appRoot.require('utils/jsonapi');
const { openapi } = appRoot.require('utils/load-openapi');
const { idSelfLink, subresourceLink } = appRoot.require('utils/uri-builder');

const getSerializerArgs = (osuID, resultField, resourcePath) => {
  const resourceProp = openapi.definitions[resultField].properties.data.properties;
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
  const serializerArgs = getSerializerArgs(osuID, 'GradePointAverageResult', 'gpa');

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
  const serializerArgs = getSerializerArgs(osuID, 'AccountBalanceResult', 'account-balance');

  rawAccountBalance.currentBalance = parseFloat(rawAccountBalance.currentBalance);

  return new JSONAPISerializer(
    serializerArgs.resourceType,
    serializerOptions(serializerArgs),
  ).serialize(rawAccountBalance);
};

const serializeAccountTransactions = (rawTransactions, osuID) => {
  const serializerArgs = getSerializerArgs(osuID, 'AccountTransactionsResult', 'account-transactions');

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

module.exports = { serializeGPA, serializeAccountBalance, serializeAccountTransactions };
