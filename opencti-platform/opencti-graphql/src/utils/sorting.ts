import { isDateNumericOrBooleanAttribute, schemaAttributesDefinition } from '../schema/schema-attributes';
import { UnsupportedError } from '../config/errors';

export const buildElasticSortingForAttributeCriteria = (orderCriteria: string, orderMode: 'asc' | 'desc') => {
  const definition = schemaAttributesDefinition.getAttributeByName(orderCriteria);

  // criteria not in schema, attempt keyword sorting as a last resort
  if (!definition) {
    return { [`${orderCriteria}.keyword`]: { order: orderMode, missing: '_last' } };
  }

  if (isDateNumericOrBooleanAttribute(orderCriteria) || orderCriteria.startsWith('_')) {
    // sorting on null dates results to an error, one way to fix it is to use missing: 0
    // see https://github.com/elastic/elasticsearch/issues/81960
    return { [orderCriteria]: { order: orderMode, missing: definition?.type === 'date' ? 0 : '_last' } };
  }

  // for sorting by object attribute, we need the sortBy def to know which internal mapping to use
  if (definition?.type === 'object' && definition.format === 'standard') {
    const { sortBy, mappings } = definition;
    if (sortBy) {
      const sortByMapping = mappings.find((m) => m.name === sortBy);
      if (!sortByMapping) {
        throw UnsupportedError(`Sorting on ${orderCriteria}] over [${sortBy}] is not supported: ${sortBy} is not in the object mappings`);
      }
      if (sortByMapping?.type === 'numeric' || sortByMapping?.type === 'boolean' || sortByMapping?.type === 'date') {
        return { [`${orderCriteria}.${sortBy}`]: { order: orderMode, missing: sortByMapping.type === 'date' ? 0 : '_last' } };
      }
      return { [`${orderCriteria}.${sortBy}.keyword`]: { order: orderMode, missing: '_last' } };
    }
    throw UnsupportedError(`Sorting on ${orderCriteria}] is not supported: this criteria does not have a sortBy definition in schema`);
  }

  return { [`${orderCriteria}.keyword`]: { order: orderMode, missing: '_last' } };
};
