import { errorHandler } from 'errors/errors';

import { getAcademicStatusById } from '../../../db/oracledb/students-dao';

/**
 * Get academic status
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getAcademicStatusById(osuId, req.query);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
