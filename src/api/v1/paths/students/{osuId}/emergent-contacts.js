import { errorHandler } from 'errors/errors';

import { getEmergentContactsById } from '../../../db/oracledb/students-dao';

/**
 * Get emergent contacts
 *
 * @type {RequestHandler}
 */
const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const result = await getEmergentContactsById(osuId);
    res.send(result);
  } catch (err) {
    errorHandler(res, err);
  }
};

export { get };
