import { errorHandler } from 'errors/errors';

import { getDegreesById } from '../../../db/oracledb/students-dao';

/**
 * Get degree
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getDegreesById(osuId, req.query);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
