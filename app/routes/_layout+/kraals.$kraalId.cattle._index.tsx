import { AssetStatus, type Cattle } from "@prisma/client";
import {
  json,
  type MetaFunction,
  type LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { z } from "zod";
import BulkActionsDropdown from "~/components/assets/bulk-actions-dropdown";
import { StatusFilter } from "~/components/booking/status-filter";
import { CattleImage } from "~/components/cattle/asset-image";
import type { HeaderData } from "~/components/layout/header/types";
import { List, type ListProps } from "~/components/list";
import { ListContentWrapper } from "~/components/list/content-wrapper";
import { Filters } from "~/components/list/filters";
import { SortBy } from "~/components/list/filters/sort-by";
import { Button } from "~/components/shared/button";
import { GrayBadge } from "~/components/shared/gray-badge";
import { Td, Th } from "~/components/table";
import { db } from "~/database/db.server";
import {
  useClearValueFromParams,
  useSearchParamHasValue,
} from "~/hooks/search-params";
import { getPaginatedFilteredKraalCattle } from "~/modules/asset/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { getFiltersFromRequest, setCookie } from "~/utils/cookies.server";
import { makeShelfError, ShelfError } from "~/utils/error";
import { data, error, getParams } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";

export async function loader({ context, params, request }: LoaderFunctionArgs) {
  try {
    const authSession = context.getSession();
    const { userId } = authSession;

    const [{ organizationId }] = await Promise.all([
      requirePermission({
        userId,
        request,
        entity: PermissionEntity.asset,
        action: PermissionAction.read,
      }),
      db.user
        .findUniqueOrThrow({
          where: {
            id: userId,
          },
          select: {
            firstName: true,
          },
        })
        .catch((cause) => {
          throw new ShelfError({
            cause,
            message:
              "We can't find your user data. Please try again or contact support.",
            additionalData: { userId },
            label: "Assets",
          });
        }),
    ]);

    const { kraalId: id } = getParams(
      params,
      z.object({ kraalId: z.string() }),
      {
        additionalData: { userId },
      }
    );

    const {
      filters,
      serializedCookie: filtersCookie,
      redirectNeeded,
    } = await getFiltersFromRequest(request, organizationId);

    if (filters && redirectNeeded) {
      const cookieParams = new URLSearchParams(filters);
      return redirect(`/kraal/${id}/cattle?${cookieParams.toString()}`);
    }

    const { kraal, cattle, totalCattle, totalPages, perPage, page } =
      await getPaginatedFilteredKraalCattle({
        kraalId: id,
        userId,
        request,
        filters,
      });

    const header: HeaderData = {
      title: `${kraal.name}'s cattle`,
    };

    const modelName = {
      singular: "Cattle",
      plural: "Cattle",
    };

    const headers = [...(filtersCookie ? [setCookie(filtersCookie)] : [])];

    return json(
      data({
        header,
        items: cattle,
        totalItems: totalCattle,
        totalPages,
        perPage,
        page,
        filters,
        organizationId,
        modelName,
      }),
      {
        headers,
      }
    );
  } catch (cause) {
    const reason = makeShelfError(cause);
    throw json(error(reason));
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.header.title) : "" },
];

export const handle = {
  breadcrumb: () => "Cattle",
};

export default function KraalCattleIndexPage() {
  return (
    <>
      <Button
        to="new"
        role="link"
        aria-label={`New Cattle`}
        icon="plus"
        data-test-id="createNeCattle"
      >
        Add Cattle
      </Button>
      <CattleList />
    </>
  );
}

export const CattleList = ({
  customEmptyState,
  disableTeamMemberFilter,
  disableBulkActions,
}: {
  customEmptyState?: ListProps["customEmptyStateContent"];
  disableTeamMemberFilter?: boolean;
  disableBulkActions?: boolean;
}) => {
  const navigate = useNavigate();
  const searchParams: string[] = ["category", "tag", "location"];
  if (!disableTeamMemberFilter) {
    searchParams.push("teamMember");
  }
  const hasFiltersToClear = useSearchParamHasValue(...searchParams);
  const clearFilters = useClearValueFromParams(...searchParams);

  return (
    <ListContentWrapper>
      <Filters
        slots={{
          "left-of-search": <StatusFilter statusItems={AssetStatus} />,
          "right-of-search": <SortBy />,
        }}
      >
        <div className="flex w-full items-center justify-around gap-6 md:w-auto md:justify-end">
          {hasFiltersToClear ? (
            <div className="hidden gap-6 md:flex">
              <Button
                as="button"
                onClick={clearFilters}
                variant="link"
                className="block min-w-28 max-w-none font-normal text-gray-500 hover:text-gray-600"
                type="button"
              >
                Clear all filters
              </Button>
              <div className="text-gray-500"> | </div>
            </div>
          ) : null}
        </div>
      </Filters>
      <List
        title="Kraals"
        ItemComponent={ListCattleContent}
        /**
         * Using remix's navigate is the default behaviour, however it can receive also a custom function
         */
        navigate={(itemId) => navigate(`/cattle/${itemId}`)}
        bulkActions={disableBulkActions ? undefined : <BulkActionsDropdown />}
        customEmptyStateContent={
          customEmptyState ? customEmptyState : undefined
        }
        headerChildren={
          <>
            <Th>Gender</Th>
            <Th>Breed</Th>
            <Th>Tag No.</Th>
          </>
        }
      />
    </ListContentWrapper>
  );
};

export const ListCattleContent = ({ item }: { item: Cattle }) => {
  const { tagNumber, breed, gender, name } = item;

  return (
    <>
      {/* Item */}
      <Td className="w-full whitespace-normal p-0 md:p-0">
        <div className="flex justify-between gap-3 p-4  md:justify-normal md:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex size-12 shrink-0 items-center justify-center">
              <CattleImage
                cattle={{
                  cattleId: item.id,
                  mainImage: item.mainImage,
                  alt: item.id,
                }}
                className="size-full rounded-[4px] border object-cover"
              />
            </div>
            <div className="min-w-[130px]">
              <span className="word-break mb-1 block font-medium">{name}</span>
            </div>
            {/* Health status */}
            <div className="hidden md:block">
              <GrayBadge>{item.healthStatus}</GrayBadge>
            </div>
          </div>
        </div>
      </Td>
      {/* Gender */}
      <Td>
        <GrayBadge>{gender}</GrayBadge>
      </Td>
      {/* Breed */}
      <Td>
        <GrayBadge>{breed}</GrayBadge>
      </Td>
      {/* Tag number */}
      <Td>{location ? <GrayBadge>{tagNumber}</GrayBadge> : null}</Td>
    </>
  );
};
