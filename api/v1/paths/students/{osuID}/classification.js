const appRoot = require('app-root-path');

const studentsDAO = require('../../../db/oracledb/students-dao');

const { paths } = appRoot.require('app').locals.openapi;
const { errorBuilder, errorHandler } = appRoot.require('errors/errors');

const get = async (req, res) => {
  try {
    const { osuID } = req.params;
    const result = await studentsDAO.getClassificationById(osuID);
    if (result === undefined) {
      errorBuilder(res, 404, 'A student with the OSU ID was not found.');
    } else {
      res.send(result);
    }
  } catch (err) {
    errorHandler(res, err);
  }
};

get.apiDoc = paths['/students/{osuID}/classification'].get;

module.exports = { get };
