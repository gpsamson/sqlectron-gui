import path from 'path';
import trim from 'lodash.trim';
import cloneDeep from 'lodash.clonedeep';
import csvStringify from 'csv-stringify';
import { clipboard } from 'electron'; // eslint-disable-line import/no-unresolved
import { getCurrentDBConn, getDBConnByName } from './connections';
import { rowsValuesToString } from '../utils/convert';
import * as fileHandler from '../utils/file-handler';
import wait from '../utils/wait';


export const NEW_QUERY = 'NEW_QUERY';
export const RENAME_QUERY = 'RENAME_QUERY';
export const SELECT_QUERY = 'SELECT_QUERY';
export const REMOVE_QUERY = 'REMOVE_QUERY';
export const EXECUTE_QUERY_REQUEST = 'EXECUTE_QUERY_REQUEST';
export const EXECUTE_QUERY_SUCCESS = 'EXECUTE_QUERY_SUCCESS';
export const EXECUTE_QUERY_FAILURE = 'EXECUTE_QUERY_FAILURE';
export const CANCEL_QUERY_REQUEST = 'CANCEL_QUERY_REQUEST';
export const CANCEL_QUERY_SUCCESS = 'CANCEL_QUERY_SUCCESS';
export const CANCEL_QUERY_FAILURE = 'CANCEL_QUERY_FAILURE';
export const COPY_QUERY_RESULT_TO_CLIPBOARD_REQUEST = 'COPY_QUERY_RESULT_TO_CLIPBOARD_REQUEST';
export const COPY_QUERY_RESULT_TO_CLIPBOARD_SUCCESS = 'COPY_QUERY_RESULT_TO_CLIPBOARD_SUCCESS';
export const COPY_QUERY_RESULT_TO_CLIPBOARD_FAILURE = 'COPY_QUERY_RESULT_TO_CLIPBOARD_FAILURE';
export const SAVE_QUERY_REQUEST = 'SAVE_QUERY_REQUEST';
export const SAVE_QUERY_SUCCESS = 'SAVE_QUERY_SUCCESS';
export const SAVE_QUERY_FAILURE = 'SAVE_QUERY_FAILURE';
export const OPEN_QUERY_REQUEST = 'OPEN_QUERY_REQUEST';
export const OPEN_QUERY_SUCCESS = 'OPEN_QUERY_SUCCESS';
export const OPEN_QUERY_FAILURE = 'OPEN_QUERY_FAILURE';
export const UPDATE_QUERY = 'UPDATE_QUERY';


export function newQuery (database, databaseId) {
  return { type: NEW_QUERY, database, databaseId };
}


export function renameQuery (name) {
  return { type: RENAME_QUERY, name };
}


export function selectQuery (id) {
  return { type: SELECT_QUERY, id };
}


export function removeQuery (id) {
  return { type: REMOVE_QUERY, id };
}


export function executeQueryIfNeeded (query, queryId) {
  return (dispatch, getState) => {
    if (shouldExecuteQuery(query, getState())) {
      dispatch(executeQuery(query, false, null, queryId));
    }
  };
}


export function executeDefaultSelectQueryIfNeeded (database, databaseId, table, schema) {
  return async (dispatch, getState) => {
    const currentState = getState();
    const dbConn = getDBConnByName(database);
    const queryDefaultSelect = await dbConn.getQuerySelectTop(table, schema);

    if (!shouldExecuteQuery(queryDefaultSelect, currentState)) {
      return;
    }

    if (needNewQuery(currentState, database, queryDefaultSelect)) {
      dispatch({ type: NEW_QUERY, database, databaseId, table });
    }

    dispatch({ type: UPDATE_QUERY, query: queryDefaultSelect, table });
    dispatch(executeQuery(queryDefaultSelect, true, dbConn));
  };
}

export function updateQueryIfNeeded (query, selectedQuery) {
  return (dispatch, getState) => {
    if (shouldUpdateQuery(query, selectedQuery, getState())) {
      dispatch(updateQuery(query, selectedQuery));
    }
  };
}

function updateQuery (query, selectedQuery) {
  return { type: UPDATE_QUERY, query, selectedQuery };
}

function shouldUpdateQuery (query, selectedQuery, state) {
  const currentQuery = getCurrentQuery(state);
  if (!currentQuery) return true;
  if (currentQuery.isExecuting) return false;
  if (query === currentQuery.query
      && (selectedQuery !== undefined && selectedQuery === currentQuery.selectedQuery)) {
    return false;
  }

  return true;
}

export function appendQuery (query) {
  return (dispatch, getState) => {
    const currentQuery = getCurrentQuery(getState()).query;
    const newLine = !currentQuery ? '' : '\n';
    const appendedQuery = `${currentQuery}${newLine}${query}`;
    if (!currentQuery.isExecuting) {
      dispatch(updateQuery(appendedQuery));
    }
  };
}


export function copyToClipboard (fields, rows, type) {
  return async dispatch => {
    dispatch({ type: COPY_QUERY_RESULT_TO_CLIPBOARD_REQUEST });
    try {
      let value;
      if (type === 'CSV') {
        value = await stringifyResultToCSV(fields, rows);
      } else {
        // force the next dispatch be separately
        // handled of the previous one
        await wait(0);
        value = JSON.stringify(rows, null, 2);
      }
      clipboard.writeText(value);
      dispatch({ type: COPY_QUERY_RESULT_TO_CLIPBOARD_SUCCESS });
    } catch (error) {
      dispatch({ type: COPY_QUERY_RESULT_TO_CLIPBOARD_FAILURE, error });
    }
  };
}


export function saveQuery () {
  return async (dispatch, getState) => {
    dispatch({ type: SAVE_QUERY_REQUEST });
    try {
      const currentQuery = getCurrentQuery(getState());
      const filters = [
        { name: 'SQL', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] },
      ];

      let filename = (currentQuery.filename || await fileHandler.showSaveDialog(filters));
      if (path.extname(filename) !== '.sql') {
        filename += '.sql';
      }

      await fileHandler.saveFile(filename, currentQuery.query);
      const name = path.basename(filename, '.sql');

      dispatch({ type: SAVE_QUERY_SUCCESS, name, filename });
    } catch (error) {
      dispatch({ type: SAVE_QUERY_FAILURE, error });
    }
  };
}

export function openQuery () {
  return async (dispatch) => {
    dispatch({ type: OPEN_QUERY_REQUEST });
    try {
      const filters = [
        { name: 'SQL', extensions: ['sql'] },
      ];

      const [filename] = await fileHandler.showOpenDialog(filters);
      const name = path.basename(filename, '.sql');

      const query = await fileHandler.openFile(filename);

      dispatch({ type: OPEN_QUERY_SUCCESS, name, query });
    } catch (error) {
      dispatch({ type: OPEN_QUERY_FAILURE, error });
    }
  };
}


function shouldExecuteQuery (query, state) {
  const currentQuery = getCurrentQuery(state);
  if (!currentQuery) return true;
  if (currentQuery.isExecuting) return false;
  return true;
}

const executingQueries = {};

function canCancelQuery(state) {
  return !state.connections.disabledFeatures.includes('cancelQuery');
}

function executeQuery (query, isDefaultSelect = false, dbConnection, queryId) {
  return async (dispatch, getState) => {
    dispatch({ type: EXECUTE_QUERY_REQUEST, query, isDefaultSelect });
    try {
      const state = getState();
      const dbConn = dbConnection || getCurrentDBConn(state);

      // Get the current query productId and product name
      const databaseId = state.queries.queriesById[queryId].databaseId;
      const database = state.queries.queriesById[queryId].database;

      // Get the list of visible events and props.
      const events = state.events.itemsByDatabase[database]
      const properties = state.properties.itemsByDatabase[database]

      let remoteResult;
      if (canCancelQuery(state)) {
        console.log('can cancel query');
        executingQueries[queryId] = dbConn.query(query, databaseId, events, properties);
        remoteResult = await executingQueries[queryId].execute();
      } else {
        console.log('else statement');
        console.log(databaseId);
        remoteResult = await dbConn.executeQuery(query, databaseId, events, properties);
      }

      // Remove any "reference" to the remote IPC object
      const results = cloneDeep(remoteResult);

      dispatch({ type: EXECUTE_QUERY_SUCCESS, query, results });
    } catch (error) {
      console.log(error);
      dispatch({ type: EXECUTE_QUERY_FAILURE, query, error });
    } finally {
      delete executingQueries[queryId];
    }
  };
}


export function cancelQuery (queryId) {
  return async (dispatch) => {
    dispatch({ type: CANCEL_QUERY_REQUEST, queryId });
    try {
      if (executingQueries[queryId]) {
        await executingQueries[queryId].cancel();
      }

      dispatch({ type: CANCEL_QUERY_SUCCESS, queryId });
    } catch (error) {
      dispatch({ type: CANCEL_QUERY_FAILURE, queryId, error });
    } finally {
      delete executingQueries[queryId];
    }
  };
}


function stringifyResultToCSV(fields, rows) {
  if (!rows.length) {
    return '';
  }
  
  console.log(fields)

  const header = fields.reduce((_header, col) => {
    _header[col.name] = col.name; // eslint-disable-line no-param-reassign
    return _header;
  }, {});

  console.log(header)

  const data = [
    header,
    ...rowsValuesToString(rows),
  ];

  return new Promise((resolve, reject) => {
    csvStringify(data, (err, csv) => {
      if (err) {
        reject(err);
      } else {
        resolve(csv);
      }
    });
  });
}


function getCurrentQuery(state) {
  return state.queries.queriesById[state.queries.currentQueryId];
}

function needNewQuery(currentState, database, queryDefaultSelect) {
  const currentQuery = getCurrentQuery(currentState);
  if (!currentQuery) {
    return false;
  }

  const queryIsDifferentDB = currentQuery.database !== database;
  const queryIsNotDefault = currentQuery.query !== queryDefaultSelect;
  const queryIsNotEmpty = !!trim(currentQuery.query);

  return queryIsDifferentDB || (queryIsNotDefault && queryIsNotEmpty);
}
