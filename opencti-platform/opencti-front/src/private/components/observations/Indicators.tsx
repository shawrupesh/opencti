import React from 'react';
import { graphql } from 'react-relay';
import { IndicatorsLinesPaginationQuery, IndicatorsLinesPaginationQuery$variables } from '@components/observations/__generated__/IndicatorsLinesPaginationQuery.graphql';
import { IndicatorsLines_data$data } from '@components/observations/__generated__/IndicatorsLines_data.graphql';
import IndicatorCreation from './indicators/IndicatorCreation';
import IndicatorsRightBar from './indicators/IndicatorsRightBar';
import Security from '../../../utils/Security';
import { KNOWLEDGE_KNUPDATE } from '../../../utils/hooks/useGranted';
import { usePaginationLocalStorage } from '../../../utils/hooks/useLocalStorage';
import useQueryLoading from '../../../utils/hooks/useQueryLoading';
import { useBuildEntityTypeBasedFilterContext, emptyFilterGroup, findFilterFromKey, useGetDefaultFilterObject } from '../../../utils/filters/filtersUtils';
import { useFormatter } from '../../../components/i18n';
import Breadcrumbs from '../../../components/Breadcrumbs';
import DataTable from '../../../components/dataGrid/DataTable';
import useAuth from '../../../utils/hooks/useAuth';
import { UsePreloadedPaginationFragment } from '../../../utils/hooks/usePreloadedPaginationFragment';

const LOCAL_STORAGE_KEY = 'indicators-list';

const indicatorLineFragment = graphql`
  fragment IndicatorsLine_node on Indicator {
    id
    entity_type
    name
    pattern_type
    valid_from
    valid_until
    x_opencti_score
    x_opencti_main_observable_type
    created
    confidence
    createdBy {
      ... on Identity {
        id
        name
        entity_type
      }
    }
    objectMarking {
      id
      definition_type
      definition
      x_opencti_order
      x_opencti_color
    }
    objectLabel {
      id
      value
      color
    }
    creators {
      id
      name
    }
  }
`;

const indicatorsLinesQuery = graphql`
  query IndicatorsLinesPaginationQuery(
    $search: String
    $count: Int!
    $cursor: ID
    $filters: FilterGroup
    $orderBy: IndicatorsOrdering
    $orderMode: OrderingMode
  ) {
    ...IndicatorsLines_data
    @arguments(
      search: $search
      count: $count
      cursor: $cursor
      filters: $filters
      orderBy: $orderBy
      orderMode: $orderMode
    )
  }
`;

const indicatorsLinesFragment = graphql`
  fragment IndicatorsLines_data on Query
  @argumentDefinitions(
    search: { type: "String" }
    count: { type: "Int", defaultValue: 25 }
    cursor: { type: "ID" }
    filters: { type: "FilterGroup" }
    orderBy: { type: "IndicatorsOrdering", defaultValue: valid_from }
    orderMode: { type: "OrderingMode", defaultValue: desc }
  )
  @refetchable(queryName: "IndicatorsLinesRefetchQuery") {
    indicators(
      search: $search
      first: $count
      after: $cursor
      filters: $filters
      orderBy: $orderBy
      orderMode: $orderMode
    ) @connection(key: "Pagination_indicators") {
      edges {
        node {
          id
          ...IndicatorsLine_node
        }
      }
      pageInfo {
        endCursor
        hasNextPage
        globalCount
      }
    }
  }
`;

const Indicators = () => {
  const {
    platformModuleHelpers: { isRuntimeFieldEnable },
  } = useAuth();
  const { t_i18n } = useFormatter();
  const isRuntimeSort = isRuntimeFieldEnable();

  const initialValues = {
    filters: {
      ...emptyFilterGroup,
      filters: useGetDefaultFilterObject(['sightedBy'], ['Indicator']),
    },
    searchTerm: '',
    sortBy: 'created',
    orderAsc: false,
    openExports: false,
    count: 25,
  };
  const {
    viewStorage: { filters, openExports },
    paginationOptions,
    helpers: storageHelpers,
  } = usePaginationLocalStorage<IndicatorsLinesPaginationQuery$variables>(
    LOCAL_STORAGE_KEY,
    initialValues,
  );

  const contextFilters = useBuildEntityTypeBasedFilterContext('Indicator', filters);
  const queryPaginationOptions = {
    ...paginationOptions,
    filters: contextFilters,
  } as unknown as IndicatorsLinesPaginationQuery$variables;
  const queryRef = useQueryLoading<IndicatorsLinesPaginationQuery>(
    indicatorsLinesQuery,
    queryPaginationOptions,
  );

  const patternTypes = findFilterFromKey(filters?.filters ?? [], 'pattern_type')?.values ?? [];
  const observableTypes = findFilterFromKey(filters?.filters ?? [], 'x_opencti_main_observable_type')?.values ?? [];
  const handleToggleIndicatorType = (type: string) => {
    if (patternTypes.includes(type)) {
      storageHelpers.handleRemoveFilter('pattern_type', 'eq', type);
    } else {
      storageHelpers.handleAddFilter('pattern_type', type);
    }
  };
  const handleToggleObservableType = (type: string) => {
    if (observableTypes.includes(type)) {
      storageHelpers.handleRemoveFilter('x_opencti_main_observable_type', 'eq', type);
    } else {
      storageHelpers.handleAddFilter(
        'x_opencti_main_observable_type',
        type,
      );
    }
  };
  const handleClearObservableTypes = () => {
    storageHelpers.handleRemoveFilter('x_opencti_main_observable_type');
  };

  const dataColumns = {
    pattern_type: {},
    name: { flexSize: 21 },
    createdBy: {
      isSortable: isRuntimeSort ?? false,
    },
    creator: {
      isSortable: isRuntimeSort ?? false,
    },
    objectLabel: {},
    created: { flexSize: 10 },
    valid_until: {
      label: 'Valid until',
      flexSize: 10,
      isSortable: true,
    },
    objectMarking: {
      flexSize: 10,
      isSortable: isRuntimeSort ?? false,
    },
  };

  const preloadedPaginationOptions = {
    linesQuery: indicatorsLinesQuery,
    linesFragment: indicatorsLinesFragment,
    queryRef,
    nodePath: ['indicators', 'pageInfo', 'globalCount'],
    setNumberOfElements: storageHelpers.handleSetNumberOfElements,
  } as UsePreloadedPaginationFragment<IndicatorsLinesPaginationQuery>;

  return (
    <>
      <Breadcrumbs variant="list" elements={[{ label: t_i18n('Observations') }, { label: t_i18n('Indicators'), current: true }]} />
      <div style={{ paddingRight: 250 }}>
        {queryRef && (
          <DataTable
            dataColumns={dataColumns}
            resolvePath={(data: IndicatorsLines_data$data) => data.indicators?.edges?.map((n) => n?.node)}
            storageKey={LOCAL_STORAGE_KEY}
            initialValues={initialValues}
            toolbarFilters={contextFilters}
            lineFragment={indicatorLineFragment}
            preloadedPaginationProps={preloadedPaginationOptions}
            filterExportContext={{ entity_type: 'Indicator' }}
          />
        )}
      </div>
      <Security needs={[KNOWLEDGE_KNUPDATE]}>
        <IndicatorCreation paginationOptions={queryPaginationOptions} />
      </Security>
      <IndicatorsRightBar
        indicatorTypes={patternTypes}
        observableTypes={observableTypes}
        handleToggleIndicatorType={handleToggleIndicatorType}
        handleToggleObservableType={handleToggleObservableType}
        handleClearObservableTypes={handleClearObservableTypes}
        openExports={openExports}
      />
    </>
  );
};

export default Indicators;
