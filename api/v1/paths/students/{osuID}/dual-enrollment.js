const appRoot = require('app-root-path');

const studentsDAO = require('../../../db/oracledb/students-dao');

const { paths } = appRoot.require('app').locals.openapi;
const { errorBuilder, errorHandler } = appRoot.require('errors/errors');

const get = async (req, res) => {
  try {
    const { osuID } = req.params;
    const { term } = req.query;
    const result = await studentsDAO.getDualEnrollmentById(osuID, term);
    if (result === undefined) {
      errorBuilder(res, 404, 'A student with the OSU ID was not found.');
    } else {
      res.send(result);
    }
  } catch (err) {
    errorHandler(res, err);
  }
};

get.apiDoc = paths['/students/{osuID}/dual-enrollment'].get;

module.exports = { get };
