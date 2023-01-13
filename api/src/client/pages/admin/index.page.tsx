import * as React from 'react';
import { type ExecutionResult } from 'graphql';

import { type IndexPageQuery } from '~/client/graphql.gen';
import { type PageContext } from '~/client/ssr';
import { Link } from 'react-router-dom';

export async function getPageProps({ req }: PageContext) {
  if (!req.sessionOrRedirect()) {
    return;
  }

  if (!req.activeMemberOrRedirect()) {
    return;
  }

  const result = await req.executeGraphQL(/* GraphQL */`
    query IndexPage {
      site {
        permissions {
          canCreateOrganization
        }
      }
    }
  `);

  return result;
}

export default function IndexPage({ data }: ExecutionResult<IndexPageQuery>) {
  return (
    <div>
      Hello World

      {data?.site.permissions.canCreateOrganization && (
        <Link to="/admin/orgs/new">
          Create Organization
        </Link>
      )}
    </div>
  );
}
