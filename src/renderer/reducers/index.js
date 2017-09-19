import { combineReducers } from 'redux';
import config from './config';
import databases from './databases';
import servers from './servers';
import queries from './queries';
import connections from './connections';
import schemas from './schemas';
import tables from './tables';
import status from './status';
import views from './views';
import routines from './routines';
import columns from './columns';
import triggers from './triggers';
import indexes from './indexes';
import sqlscripts from './sqlscripts';
import keys from './keys';
import properties from './properties';
import events from './events';

const rootReducer = combineReducers({
  config,
  databases,
  servers,
  queries,
  connections,
  schemas,
  tables,
  status,
  views,
  routines,
  columns,
  triggers,
  indexes,
  sqlscripts,
  keys,
  properties,
  events,
});


export default rootReducer;
