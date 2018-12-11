const appRoot = require('app-root-path');
const _ = require('lodash');
const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const { serializerOptions } = appRoot.require('utils/jsonapi');
const { openapi } = appRoot.require('utils/load-openapi');
const { idSelfLink, subresourceLink } = appRoot.require('utils/uri-builder');

/**
 * @summary Serializer petResources to JSON API
 * @function
 * @param {[Object]} rawPets Raw data rows from data source
 * @param {Object} query Query parameters
 * @returns {Object} Serialized petResources object
 */
const SerializedGPAs = (rawGPALevels, osuID) => {
  const ResourceProp = openapi.definitions.GradePointAverageResult.properties.data.properties;
  const ResourceType = ResourceProp.type.enum[0];
  const ResourceKeys = _.keys(ResourceProp.attributes.properties);
  const ResourcePath = 'gpa';

  const serializerArgs = {
    identifierField: 'osuID',
    resourceKeys: ResourceKeys,
  };

  const rawGPAs = {
    osuID,
    gpaLevels: rawGPALevels,
  };

  const studentSelfLink = idSelfLink(osuID, 'students');
  const topLevelSelfLink = subresourceLink(studentSelfLink, ResourcePath);

  return new JSONAPISerializer(
    ResourceType,
    serializerOptions(serializerArgs, 'students', topLevelSelfLink, ResourcePath),
  ).serialize(rawGPAs);
};

/**
 * @summary Serializer petResources to JSON API
 * @function
 * @param {[Object]} rawPets Raw data rows from data source
 * @param {Object} query Query parameters
 * @returns {Object} Serialized petResources object
 */
const SerializedAccountBalance = (rawAccountBalance, osuID) => {
  const ResourceProp = openapi.definitions.AccountBalanceResult.properties.data.properties;
  const ResourceType = ResourceProp.type.enum[0];
  const ResourceKeys = _.keys(ResourceProp.attributes.properties);
  const ResourcePath = 'account-balance';

  const serializerArgs = {
    identifierField: 'osuID',
    resourceKeys: ResourceKeys,
  };

  const studentSelfLink = idSelfLink(osuID, 'students');
  const topLevelSelfLink = subresourceLink(studentSelfLink, ResourcePath);

  return new JSONAPISerializer(
    ResourceType,
    serializerOptions(serializerArgs, 'students', topLevelSelfLink, ResourcePath),
  ).serialize(rawAccountBalance);
};

module.exports = { SerializedGPAs, SerializedAccountBalance };
