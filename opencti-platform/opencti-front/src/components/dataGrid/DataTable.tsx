import React from 'react';
import { useSettingsMessagesBannerHeight } from '@components/settings/settings_messages/SettingsMessagesBanner';
import * as R from 'ramda';
import DataTableToolBar from '@components/data/DataTableToolBar';
import makeStyles from '@mui/styles/makeStyles';
import { OperationType } from 'relay-runtime';
import DataTableFilters, { DataTableDisplayFilters } from './DataTableFilters';
import SearchInput from '../SearchInput';
import type { DataTableProps } from './dataTableTypes';
import { usePaginationLocalStorage } from '../../utils/hooks/useLocalStorage';
import useAuth from '../../utils/hooks/useAuth';
import { useComputeLink, useDataCellHelpers, useDataTable, useDataTableLocalStorage, useDataTableToggle, useLineData } from './dataTableHooks';
import DataTableComponent from './DataTableComponent';
import { useFormatter } from '../i18n';
import { SELECT_COLUMN_SIZE } from './DataTableHeader';
import type { Theme } from '../Theme';
import { getDefaultFilterObject } from '../../utils/filters/filtersUtils';
import { UsePreloadedPaginationFragment } from '../../utils/hooks/usePreloadedPaginationFragment';
import { FilterIconButtonProps } from '../FilterIconButton';

type OCTIDataTableProps = Pick<DataTableProps, 'dataColumns'
| 'resolvePath'
| 'storageKey'
| 'initialValues'
| 'parametersWithPadding'
| 'toolbarFilters'
| 'lineFragment'
| 'availableFilterKeys'
| 'redirectionModeEnabled'
| 'additionalFilterKeys'
| 'entityTypes'> & {
  preloadedPaginationProps: UsePreloadedPaginationFragment<OperationType>,
  availableRelationFilterTypes? : FilterIconButtonProps['availableRelationFilterTypes']
  availableEntityTypes? : string[]
  availableRelationshipTypes? : string[]
  searchContextFinal? : { entityTypes: string[]; elementId?: string[] | undefined; } | undefined
  filterExportContext? : { entity_type? : string, entity_id? : string }
};

const useStyles = makeStyles<Theme>((theme) => ({
  toolbar: {
    background: theme.palette.background.paper,
    width: `calc(( var(--header-table-size) - ${SELECT_COLUMN_SIZE} ) * 1px)`,
  },
}));
const DataTable = (props: OCTIDataTableProps) => {
  const { schema } = useAuth();
  const classes = useStyles();
  const formatter = useFormatter();

  const {
    storageKey,
    initialValues,
    availableFilterKeys: defaultAvailableFilterKeys,
    searchContextFinal,
    availableEntityTypes,
    availableRelationshipTypes,
    availableRelationFilterTypes,
    preloadedPaginationProps: dataQueryArgs,
    additionalFilterKeys,
    lineFragment,
    filterExportContext,
    entityTypes,
    toolbarFilters,
  } = props;

  const {
    viewStorage: {
      searchTerm,
      redirectionMode,
      numberOfElements,
      sortBy,
      orderAsc,
    },
    helpers,
    paginationOptions,
  } = usePaginationLocalStorage(storageKey, initialValues);

  const settingsMessagesBannerHeight = useSettingsMessagesBannerHeight();

  const computedEntityTypes = entityTypes ?? (filterExportContext?.entity_type ? [filterExportContext.entity_type] : []);
  let availableFilterKeys = defaultAvailableFilterKeys ?? [];
  if (availableFilterKeys.length === 0 && computedEntityTypes) {
    const filterKeysMap = new Map();
    computedEntityTypes.forEach((entityType: string) => {
      const currentMap = schema.filterKeysSchema.get(entityType);
      currentMap?.forEach((value, key) => filterKeysMap.set(key, value));
    });
    availableFilterKeys = R.uniq(Array.from(filterKeysMap.keys())); // keys of the entity type if availableFilterKeys is not specified
  }
  if (additionalFilterKeys) {
    availableFilterKeys = availableFilterKeys.concat(additionalFilterKeys);
  }

  const {
    selectedElements,
    deSelectedElements,
    numberOfSelectedElements,
    selectAll,
    handleClearSelectedElements,
  } = useDataTableToggle(storageKey);

  return (
    <DataTableComponent
      {...props}
      availableFilterKeys={availableFilterKeys}
      dataQueryArgs={dataQueryArgs}
      useLineData={useLineData(lineFragment)}
      useDataTable={useDataTable}
      useDataCellHelpers={useDataCellHelpers(helpers)}
      useDataTableToggle={useDataTableToggle}
      useComputeLink={useComputeLink}
      useDataTableLocalStorage={useDataTableLocalStorage}
      onAddFilter={(id) => helpers.handleAddFilterWithEmptyValue(getDefaultFilterObject(id))}
      formatter={formatter}
      settingsMessagesBannerHeight={settingsMessagesBannerHeight}
      storageHelpers={helpers}
      redirectionMode={redirectionMode}
      numberOfElements={numberOfElements}
      onSort={helpers.handleSort}
      sortBy={sortBy}
      orderAsc={orderAsc}
      filtersComponent={(
        <>
          <div style={{ display: 'flex', marginTop: -10 }}>
            <SearchInput
              variant={'small'}
              onSubmit={helpers.handleSearch}
              keyword={searchTerm}
            />
            <DataTableFilters
              availableFilterKeys={availableFilterKeys}
              searchContextFinal={searchContextFinal}
              availableEntityTypes={availableEntityTypes}
              availableRelationshipTypes={availableRelationshipTypes}
              availableRelationFilterTypes={availableRelationFilterTypes}
              filterExportContext={filterExportContext}
              paginationOptions={paginationOptions}
            />
          </div>
          <DataTableDisplayFilters
            availableFilterKeys={availableFilterKeys}
            availableRelationFilterTypes={availableRelationFilterTypes}
            additionalFilterKeys={additionalFilterKeys}
            entityTypes={computedEntityTypes}
            paginationOptions={paginationOptions}
          />
        </>
      )}
      dataTableToolBarComponent={(
        <>
          <div
            className={classes.toolbar}
          >
            <DataTableToolBar
              selectedElements={selectedElements}
              deSelectedElements={deSelectedElements}
              numberOfSelectedElements={numberOfSelectedElements}
              selectAll={selectAll}
              search={searchTerm}
              filters={toolbarFilters}
              handleClearSelectedElements={handleClearSelectedElements}
            />
          </div>
        </>
      )}
    />
  );
};

export default DataTable;
