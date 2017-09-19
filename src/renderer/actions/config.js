import cloneDeep from 'lodash.clonedeep';
import { sqlectron, config } from '../../browser/remote';
import { convertToPlainObject } from './servers';

export const LOAD_CONFIG_REQUEST = 'LOAD_CONFIG_REQUEST';
export const LOAD_CONFIG_SUCCESS = 'LOAD_CONFIG_SUCCESS';
export const LOAD_CONFIG_FAILURE = 'LOAD_CONFIG_FAILURE';


export function loadConfig() {
  return async dispatch => {
    dispatch({ type: LOAD_CONFIG_REQUEST });
    try {
      const forceCleanCache = true;
      let remoteConfig = await config.get(forceCleanCache);

      // Remove any "reference" to the remote IPC object
      let configData = cloneDeep(remoteConfig);

      // Push a base KM server if one doesn't exist.
      const kmServer = configData.servers.filter(s => s.id === 'kissmetrics');

      if (kmServer.length === 0) {
        const cryptoSecret = configData.crypto && configData.crypto.secret;

        const data = await sqlectron.servers.addOrUpdate({
          id: 'kissmetrics',
          name: 'Kissmetrics',
          client: 'kissmetrics',
          ssl: false,
          host: null,
          socketPath: null,
          schema: null,
          encrypted: false,
        }, cryptoSecret);

        const kmServer = convertToPlainObject(data);
        remoteConfig = await config.get(forceCleanCache);
        configData = cloneDeep(remoteConfig);
      }

      dispatch({ type: LOAD_CONFIG_SUCCESS, config: configData });
    } catch (error) {
      console.error(error);
      dispatch({ type: LOAD_CONFIG_FAILURE, error });
    }
  };
}
