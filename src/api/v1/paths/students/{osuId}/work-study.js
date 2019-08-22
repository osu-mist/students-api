import { errorHandler } from 'errors/errors';

import { getWorkStudyById } from '../../../db/oracledb/students-dao';

/**
 * Get work study
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getWorkStudyById(osuId);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
