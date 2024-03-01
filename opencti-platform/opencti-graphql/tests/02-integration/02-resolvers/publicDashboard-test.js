import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import gql from 'graphql-tag';
import { editorQuery, participantQuery, queryAsAdmin } from '../../utils/testQuery';
import { toBase64 } from '../../../src/database/utils';

const LIST_QUERY = gql`
  query publicDashboards(
    $first: Int
    $after: ID
    $orderBy: PublicDashboardsOrdering
    $orderMode: OrderingMode
    $filters: FilterGroup
    $search: String
  ) {
      publicDashboards(
      first: $first
      after: $after
      orderBy: $orderBy
      orderMode: $orderMode
      filters: $filters
      search: $search
    ) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const READ_QUERY = gql`
  query PublicDashboard($id: String!) {
    publicDashboard(id: $id) {
      id
      name
      uri_key
    }
  }
`;

const READ_URI_KEY_QUERY = gql`
  query PublicDashboardByUriKey($uri_key: String!) {
    publicDashboardByUriKey(uri_key: $uri_key) {
      id
      name
      uri_key
    }
  }
`;

const CREATE_PRIVATE_DASHBOARD_QUERY = gql`
    mutation WorkspaceAdd($input: WorkspaceAddInput!) {
        workspaceAdd(input: $input) {
            id
            name
        }
    }
`;

const CREATE_QUERY = gql`
  mutation PublicDashboardAdd($input: PublicDashboardAddInput!) {
    publicDashboardAdd(input: $input) {
      id
      name
      uri_key
    }
  }
`;

const UPDATE_QUERY = gql`
  mutation PublicDashboardEdit($id: ID!, $input: [EditInput!]!) {
    publicDashboardFieldPatch(id: $id, input: $input) {
      id
      name
    }
  }
`;

const UPDATE_PRIVATE_DASHBOARD_QUERY = gql`
  mutation WorkspaceEdit($id: ID!, $input: [EditInput!]!) {
    workspaceFieldPatch(id: $id, input: $input) {
      id
      name
    }
  }
`;

const DELETE_QUERY = gql`
  mutation PublicDashboardDelete($id: ID!) {
    publicDashboardDelete(id: $id)
  }
`;

const DELETE_PRIVATE_DASHBOARD_QUERY = gql`
    mutation workspaceDelete($id: ID!) {
        workspaceDelete(id: $id)
    }
`;

describe('PublicDashboard resolver', () => {
  let privateDashboardInternalId;
  const publicDashboardName = 'publicDashboard';

  beforeAll(async () => {
    // Create Private dashboard
    const privateDashboard = await queryAsAdmin({
      query: CREATE_PRIVATE_DASHBOARD_QUERY,
      variables: {
        input: {
          type: 'dashboard',
          name: 'private dashboard',
        },
      },
    });
    privateDashboardInternalId = privateDashboard.data.workspaceAdd.id;
  });

  afterAll(async () => {
    // Delete private dashboard
    await queryAsAdmin({
      query: DELETE_PRIVATE_DASHBOARD_QUERY,
      variables: { id: privateDashboardInternalId },
    });
  });

  it('Empty dashboard should not be published', async () => {
    // Create the publicDashboard
    const PUBLICDASHBOARD_TO_CREATE = {
      input: {
        name: 'private dashboard',
        dashboard_id: privateDashboardInternalId,
      },
    };
    const emptyPublicDashboard = await queryAsAdmin({
      query: CREATE_QUERY,
      variables: PUBLICDASHBOARD_TO_CREATE,
    });

    expect(emptyPublicDashboard).not.toBeNull();
    expect(emptyPublicDashboard.errors.length).toEqual(1);
    expect(emptyPublicDashboard.errors.at(0).message).toEqual('Cannot published empty dashboard');
  });

  describe('Tests with manifest', () => {
    beforeAll(async () => {
      // Add manifest to Private dashboard as empty dashboard should not be published
      const parsedManifest = {
        // TODO add needed widgets for widget api testing
        widgets: {
          'ebb25410-7048-4de7-9288-704e962215f6': {
            id: 'ebb25410-7048-4de7-9288-704e962215f6',
            type: 'number',
            perspective: 'entities',
            dataSelection: [
              {
                label: 'malwares',
                attribute: 'entity_type',
                date_attribute: 'created_at',
                perspective: 'entities',
                isTo: true,
                filters: {
                  mode: 'and',
                  filters: [{
                    key: 'entity_type',
                    values: ['Malware'],
                    operator: 'eq',
                    mode: 'or'
                  }],
                  filterGroups: []
                }
              }
            ],
            parameters: {
              title: 'malwares number'
            },
            layout: {
              w: 4,
              h: 2,
              x: 4,
              y: 0,
              i: 'ebb25410-7048-4de7-9288-704e962215f6',
              moved: false,
              static: false
            }
          },
          'ecb25410-7048-4de7-9288-704e962215f6': {
            id: 'ecb25410-7048-4de7-9288-704e962215f6',
            type: 'number',
            perspective: 'relationships',
            dataSelection: [
              {
                label: 'malwares',
                attribute: 'entity_type',
                date_attribute: 'created_at',
                perspective: 'relationships',
                isTo: true,
                filters: {
                  mode: 'and',
                  filters: [
                    {
                      key: 'toTypes',
                      values: ['Administrative-Area'],
                      operator: 'eq',
                      mode: 'or'
                    },
                    {
                      key: 'relationship_type',
                      values: ['targets'],
                      operator: 'eq',
                      mode: 'or'
                    },
                  ],
                  filterGroups: []
                }
              }
            ],
            parameters: {
              title: 'malwares attacking areas'
            },
            layout: {
              w: 4,
              h: 2,
              x: 4,
              y: 0,
              i: 'ecb25410-7048-4de7-9288-704e962215f6',
              moved: false,
              static: false
            }
          }
        },
        config: {

        }
      };
      const manifest = toBase64(JSON.stringify(parsedManifest));
      await queryAsAdmin({
        query: UPDATE_PRIVATE_DASHBOARD_QUERY,
        variables: {
          id: privateDashboardInternalId,
          input: { key: 'manifest', value: manifest },
        },
      });
    });

    describe('PublicDashboard resolver standard behavior', () => {
      let publicDashboardInternalId;
      let publicDashboardUriKey;

      it('User without EXPLORE_EXUPDATE_PUBLISH capability should not create private dashboards', async () => {
        // Create the publicDashboard
        const PUBLICDASHBOARD2_TO_CREATE = {
          input: {
            name: publicDashboardName,
            dashboard_id: privateDashboardInternalId,
          },
        };
        const publicDashboard = await participantQuery({
          query: CREATE_QUERY,
          variables: PUBLICDASHBOARD2_TO_CREATE,
        });

        expect(publicDashboard).not.toBeNull();
        expect(publicDashboard.errors.length).toEqual(1);
        expect(publicDashboard.errors.at(0).name).toEqual('FORBIDDEN_ACCESS');
      });

      it('should publicDashboard created', async () => {
        // Create the publicDashboard
        const PUBLIC_DASHBOARD_TO_CREATE = {
          input: {
            name: publicDashboardName,
            dashboard_id: privateDashboardInternalId,
          },
        };
        const publicDashboard = await queryAsAdmin({
          query: CREATE_QUERY,
          variables: PUBLIC_DASHBOARD_TO_CREATE,
        });
        expect(publicDashboard.data.publicDashboardAdd).not.toBeNull();
        expect(publicDashboard.data.publicDashboardAdd.name).toEqual(publicDashboardName);
        publicDashboardInternalId = publicDashboard.data.publicDashboardAdd.id;
        publicDashboardUriKey = publicDashboard.data.publicDashboardAdd.uri_key;
      });

      it('should publicDashboard loaded by internal id', async () => {
        const queryResult = await queryAsAdmin({
          query: READ_QUERY,
          variables: { id: publicDashboardInternalId },
        });
        expect(queryResult).not.toBeNull();
        expect(queryResult.data.publicDashboard).not.toBeNull();
        expect(queryResult.data.publicDashboard.id).toEqual(publicDashboardInternalId);
      });

      it('should fetch publicDashboard by uri key', async () => {
        const queryResult = await queryAsAdmin({
          query: READ_URI_KEY_QUERY,
          variables: { uri_key: publicDashboardUriKey },
        });
        expect(queryResult).not.toBeNull();
        expect(queryResult.data.publicDashboardByUriKey).not.toBeNull();
        expect(queryResult.data.publicDashboardByUriKey.id).toEqual(publicDashboardInternalId);
        expect(queryResult.data.publicDashboardByUriKey.uri_key).toEqual(publicDashboardUriKey);
      });

      it('should list publicDashboards', async () => {
        const queryResult = await queryAsAdmin({
          query: LIST_QUERY,
          variables: { first: 10 },
        });
        expect(queryResult.data.publicDashboards.edges.length).toEqual(1);
      });

      it('should not update publicDashboard if invalidInput key', async () => {
        const updatedDescription = 'updated Description';
        const queryResult = await queryAsAdmin({
          query: UPDATE_QUERY,
          variables: {
            id: publicDashboardInternalId,
            input: { key: 'description', value: updatedDescription },
          },
        });
        expect(queryResult).not.toBeNull();
        expect(queryResult.errors.length).toEqual(1);
        expect(queryResult.errors.at(0).message).toEqual('Only name and uri_key can be updated');
      });

      it('should update publicDashboard', async () => {
        const updatedName = `${publicDashboardName} - updated`;
        const queryResult = await queryAsAdmin({
          query: UPDATE_QUERY,
          variables: {
            id: publicDashboardInternalId,
            input: { key: 'name', value: updatedName },
          },
        });
        expect(queryResult.data.publicDashboardFieldPatch.name).toEqual(updatedName);
      });

      it('User with EXPLORE_EXUPDATE_PUBLISH capability but view access right cannot update public dashboard', async () => {
        const queryResult = await editorQuery({
          query: UPDATE_QUERY,
          variables: {
            id: publicDashboardInternalId,
            input: { key: 'name', value: ['updated name'] },
          },
        });
        expect(queryResult).not.toBeNull();
        expect(queryResult.errors.length).toEqual(1);
        expect(queryResult.errors.at(0).message).toEqual('You are not allowed to do this.');
      });

      describe('Tests widgets API', () => {
        let vadorId;
        let magnetoId;
        let octopusId;
        let franceId;
        let belgiqueId;
        let vadorFranceId;

        afterAll(async () => {
          // Delete areas.
          const DELETE_AREA = gql`
            mutation administrativeAreaDelete($id: ID!) {
              administrativeAreaDelete(id: $id)
            }
          `;
          await editorQuery({
            query: DELETE_AREA,
            variables: { id: franceId },
          });
          await editorQuery({
            query: DELETE_AREA,
            variables: { id: belgiqueId },
          });

          // Delete malwares.
          const DELETE_MALWARE = gql`
            mutation malwareDelete($id: ID!) {
              malwareEdit(id: $id) {
                delete
              }
            }
          `;
          await queryAsAdmin({
            query: DELETE_MALWARE,
            variables: { id: vadorId },
          });
          await queryAsAdmin({
            query: DELETE_MALWARE,
            variables: { id: magnetoId },
          });
          await queryAsAdmin({
            query: DELETE_MALWARE,
            variables: { id: octopusId },
          });

          // Delete relations between areas and malwares
          const DELETE_TARGETS_REL = gql`
            mutation StixCoreRelationshipDelete($id: ID!) {
              stixCoreRelationshipEdit(id: $id) {
                delete
              }
            }
          `;
          await queryAsAdmin({
            query: DELETE_TARGETS_REL,
            variables: { id: vadorFranceId },
          });
        });

        beforeAll(async () => {
          // Create some areas.
          const CREATE_AREA = gql`
            mutation AdministrativeAreaAdd($input: AdministrativeAreaAddInput!) {
              administrativeAreaAdd(input: $input) { id }
            }
          `;
          const france = await editorQuery({
            query: CREATE_AREA,
            variables: { input: { name: 'france' } },
          });
          franceId = france.data.administrativeAreaAdd.id;
          const belgique = await editorQuery({
            query: CREATE_AREA,
            variables: { input: { name: 'belgique' } },
          });
          belgiqueId = belgique.data.administrativeAreaAdd.id;

          // Create some malwares.
          const CREATE_MALWARES = gql`
            mutation MalwareAdd($input: MalwareAddInput!) {
              malwareAdd(input: $input) { id }
            }
          `;
          const vador = await editorQuery({
            query: CREATE_MALWARES,
            variables: { input: { name: 'vador', malware_types: ['ddos'] } },
          });
          vadorId = vador.data.malwareAdd.id;
          const magneto = await editorQuery({
            query: CREATE_MALWARES,
            variables: { input: { name: 'magneto', malware_types: ['backdoor'] } },
          });
          magnetoId = magneto.data.malwareAdd.id;
          const octopus = await editorQuery({
            query: CREATE_MALWARES,
            variables: { input: { name: 'octopus', malware_types: ['rootkit'] } },
          });
          octopusId = octopus.data.malwareAdd.id;

          // Create targets relationships between areas and malwares
          const ADD_TARGETS_REL = gql`
            mutation StixCoreRelationshipAdd($input: StixCoreRelationshipAddInput!) {
              stixCoreRelationshipAdd(input: $input) { id }
            }
          `;
          const vadorFrance = await editorQuery({
            query: ADD_TARGETS_REL,
            variables: {
              input: {
                relationship_type: 'targets',
                fromId: vadorId,
                toId: franceId
              }
            },
          });
          vadorFranceId = vadorFrance.data.stixCoreRelationshipAdd.id;
          // TODO add other rels (and remove them in afterAll)
        });

        it('should return the data for API: SCO Number', async () => {
          const API_SCO_NUMBER_QUERY = gql`
            query PublicStixCoreObjectsNumber(
              $startDate: DateTime
              $endDate: DateTime
              $uriKey: String!
              $widgetId : String!
            ) {
              publicStixCoreObjectsNumber(
                startDate: $startDate
                endDate: $endDate
                uriKey: $uriKey
                widgetId : $widgetId
              ) {
                total
                count
              }
            }
          `;
          const { data } = await queryAsAdmin({
            query: API_SCO_NUMBER_QUERY,
            variables: {
              uriKey: publicDashboardUriKey,
              widgetId: 'ebb25410-7048-4de7-9288-704e962215f6'
            },
          });
          const { publicStixCoreObjectsNumber } = data;
          expect(publicStixCoreObjectsNumber.total).toEqual(3);
          expect(publicStixCoreObjectsNumber.count).toEqual(0);
        });

        it('should return the data for API: SCR Number', async () => {
          const API_SCR_NUMBER_QUERY = gql`
            query PublicStixRelationshipsNumber(
              $startDate: DateTime
              $endDate: DateTime
              $uriKey: String!
              $widgetId : String!
            ) {
              publicStixRelationshipsNumber(
                startDate: $startDate
                endDate: $endDate
                uriKey: $uriKey
                widgetId : $widgetId
              ) {
                total
                count
              }
            }
          `;
          const { data } = await queryAsAdmin({
            query: API_SCR_NUMBER_QUERY,
            variables: {
              uriKey: publicDashboardUriKey,
              widgetId: 'ecb25410-7048-4de7-9288-704e962215f6'
            },
          });
          console.log(data);
          // TODO add relations and write expects
        });

        // TODO add tests for other APIS
      });

      it('should delete publicDashboard', async () => {
        // Delete the publicDashboard
        await queryAsAdmin({
          query: DELETE_QUERY,
          variables: { id: publicDashboardInternalId },
        });

        // Verify is no longer found
        const queryResult = await queryAsAdmin({
          query: LIST_QUERY,
          variables: { first: 10 },
        });
        expect(queryResult).not.toBeNull();
        expect(queryResult.data.publicDashboards.edges.length).toEqual(0);
      });
    });
  });
});
