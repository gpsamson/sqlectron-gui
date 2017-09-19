import { getCurrentDBConn } from './connections';


export const FETCH_PROPERTIES_REQUEST = 'FETCH_PROPERTIES_REQUEST';
export const FETCH_PROPERTIES_SUCCESS = 'FETCH_PROPERTIES_SUCCESS';
export const FETCH_PROPERTIES_FAILURE = 'FETCH_PROPERTIES_FAILURE';

export function fetchPropertiesIfNeeded (database, filter) {
  return (dispatch, getState) => {
    if (shouldFetchProperties(getState(), database)) {
      dispatch(fetchProperties(database, filter));
    }
  };
}


function shouldFetchProperties (state, database) {
  const properties = state.properties;
  if (!properties) return true;
  if (properties.isFetching) return false;
  if (!properties.itemsByDatabase[database]) return true;
  return properties.didInvalidate;
}


function fetchProperties (productName, productId) {
  return async (dispatch, getState) => {
    dispatch({ type: FETCH_PROPERTIES_REQUEST, database: productName });
    try {
      const dbConn = getCurrentDBConn(getState());
      const properties = await dbConn.listProperties(productId);

      dispatch({ type: FETCH_PROPERTIES_SUCCESS, database: productName, properties });
    } catch (error) {
      dispatch({ type: FETCH_PROPERTIES_FAILURE, error });
    }
  };
}
