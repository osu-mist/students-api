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
  const gpaResourceProp = openapi.definitions.GradePointAverageResult.properties.data.properties;
  const gpaResourceType = gpaResourceProp.type.enum[0];
  const gpaResourceKeys = _.keys(gpaResourceProp.attributes.properties);
  const gpaResourcePath = 'gpa';

  const serializerArgs = {
    identifierField: 'osuID',
    resourceKeys: gpaResourceKeys,
  };

  const rawGPAs = {
    osuID,
    gpaLevels: rawGPALevels,
  };

  const studentSelfLink = idSelfLink(osuID, 'students');
  const topLevelSelfLink = subresourceLink(studentSelfLink, gpaResourcePath);

  return new JSONAPISerializer(
    gpaResourceType,
    serializerOptions(serializerArgs, 'students', topLevelSelfLink, gpaResourcePath),
  ).serialize(rawGPAs);
};

module.exports = { SerializedGPAs };
