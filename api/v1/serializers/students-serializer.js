const appRoot = require('app-root-path');
const _ = require('lodash');
const JSONAPISerializer = require('jsonapi-serializer').Serializer;
const moment = require('moment-timezone');

const { serializerOptions } = appRoot.require('utils/jsonapi');
const { openapi } = appRoot.require('utils/load-openapi');
const { idSelfLink, subresourceLink } = appRoot.require('utils/uri-builder');

// const getOptions = (ResourceKeys, ResourcePath) => {
//   const studentSelfLink = idSelfLink(osuID, 'students');
//   const options = {
//     serializerArgs: {
//       identifierField: 'osuID',
//       resourceKeys: ResourceKeys,
//     },
//     topLevelSelfLink: subresourceLink(studentSelfLink, ResourcePath);
//   };
//   return options;
// };

const serializeGPA = (rawGPALevels, osuID) => {
  const ResourceProp = openapi.definitions.GradePointAverageResult.properties.data.properties;
  const ResourceType = ResourceProp.type.enum[0];
  const ResourceKeys = _.keys(ResourceProp.attributes.properties);
  const ResourcePath = 'gpa';

  const rawGPAs = {
    osuID,
    gpaLevels: rawGPALevels,
  };

  const studentSelfLink = idSelfLink(osuID, 'students');
  const topLevelSelfLink = subresourceLink(studentSelfLink, ResourcePath);

  const serializerArgs = {
    identifierField: 'osuID',
    resourceKeys: ResourceKeys,
    resourcePath: 'student',
    topLevelSelfLink,
    subresourcePath: ResourcePath,
  };

  return new JSONAPISerializer(
    ResourceType,
    serializerOptions(serializerArgs),
  ).serialize(rawGPAs);
};

const serializeAccountBalance = (rawAccountBalance, osuID) => {
  const ResourceProp = openapi.definitions.AccountBalanceResult.properties.data.properties;
  const ResourceType = ResourceProp.type.enum[0];
  const ResourceKeys = _.keys(ResourceProp.attributes.properties);
  const ResourcePath = 'account-balance';

  rawAccountBalance.currentBalance = parseFloat(rawAccountBalance.currentBalance);

  const studentSelfLink = idSelfLink(osuID, 'students');
  const topLevelSelfLink = subresourceLink(studentSelfLink, ResourcePath);

  const serializerArgs = {
    identifierField: 'osuID',
    resourceKeys: ResourceKeys,
    resourcePath: 'student',
    topLevelSelfLink,
    subresourcePath: ResourcePath,
  };

  return new JSONAPISerializer(
    ResourceType,
    serializerOptions(serializerArgs),
  ).serialize(rawAccountBalance);
};

const serializeAccountTransactions = (rawTransactions, osuID) => {
  const ResourceProp = openapi.definitions.AccountTransactionsResult.properties.data.properties;
  const ResourceType = ResourceProp.type.enum[0];
  const ResourceKeys = _.keys(ResourceProp.attributes.properties);
  const ResourcePath = 'account-transactions';

  _.forEach(rawTransactions, (rawTransaction) => {
    const rawEntryDate = rawTransaction.entryDate;
    rawTransaction.amount = parseFloat(rawTransaction.amount);
    rawTransaction.entryDate = moment.tz(rawEntryDate, 'PST8PDT').utc().format();
  });

  const rawAccountTransactions = {
    osuID,
    transactions: rawTransactions,
  };

  const studentSelfLink = idSelfLink(osuID, 'students');
  const topLevelSelfLink = subresourceLink(studentSelfLink, ResourcePath);

  const serializerArgs = {
    identifierField: 'osuID',
    resourceKeys: ResourceKeys,
    resourcePath: 'student',
    topLevelSelfLink,
    subresourcePath: ResourcePath,
  };

  return new JSONAPISerializer(
    ResourceType,
    serializerOptions(serializerArgs),
  ).serialize(rawAccountTransactions);
};

module.exports = { serializeGPA, serializeAccountBalance, serializeAccountTransactions };
