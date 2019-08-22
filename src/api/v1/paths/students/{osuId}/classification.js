import { errorHandler } from 'errors/errors';

import { getClassificationById } from '../../../db/oracledb/students-dao';

/**
 * Get classification
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getClassificationById(osuId);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
