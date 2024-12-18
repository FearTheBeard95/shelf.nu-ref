import type { Tag, Kraal } from "@prisma/client";
import { AssetStatus } from "@prisma/client";
import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import type { ShouldRevalidateFunctionArgs } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";
import { z } from "zod";
import { AssetImage } from "~/components/assets/asset-image";
import BulkActionsDropdown from "~/components/assets/bulk-actions-dropdown";

import { StatusFilter } from "~/components/booking/status-filter";
import Header from "~/components/layout/header";
import type { HeaderData } from "~/components/layout/header/types";
import type { ListProps } from "~/components/list";
import { List } from "~/components/list";
import { ListContentWrapper } from "~/components/list/content-wrapper";
import { Filters } from "~/components/list/filters";
import { SortBy } from "~/components/list/filters/sort-by";
import { Button } from "~/components/shared/button";
import { GrayBadge } from "~/components/shared/gray-badge";
import { Tag as TagBadge } from "~/components/shared/tag";

import { Td, Th } from "~/components/table";
import When from "~/components/when/when";
import { db } from "~/database/db.server";
import {
  useClearValueFromParams,
  useSearchParamHasValue,
} from "~/hooks/search-params";
import { useUserRoleHelper } from "~/hooks/user-user-role-helper";
import {
  bulkDeleteAssets,
  getPaginatedAndFilterableKraals,
} from "~/modules/asset/service.server";
import { CurrentSearchParamsSchema } from "~/modules/asset/utils.server";
import assetCss from "~/styles/assets.css?url";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { checkExhaustiveSwitch } from "~/utils/check-exhaustive-switch";
import { getFiltersFromRequest, setCookie } from "~/utils/cookies.server";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { ShelfError, makeShelfError } from "~/utils/error";
import { data, error, parseData } from "~/utils/http.server";
import { isPersonalOrg } from "~/utils/organization";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { userHasPermission } from "~/utils/permissions/permission.validator.client";
import { requirePermission } from "~/utils/roles.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: assetCss },
];

export async function loader({ context, request }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const [{ organizationId, currentOrganization }, user] = await Promise.all([
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
    const {
      filters,
      serializedCookie: filtersCookie,
      redirectNeeded,
    } = await getFiltersFromRequest(request, organizationId);

    if (filters && redirectNeeded) {
      const cookieParams = new URLSearchParams(filters);
      return redirect(`/kraal?${cookieParams.toString()}`);
    }

    let [{ kraals, totalKraals, totalPages, page, perPage }] =
      await Promise.all([
        getPaginatedAndFilterableKraals({
          request,
          userId,
          filters,
        }),
      ]);

    const header: HeaderData = {
      title: isPersonalOrg(currentOrganization)
        ? user?.firstName
          ? `${user.firstName}'s inventory`
          : `Your inventory`
        : currentOrganization?.name
        ? `${currentOrganization?.name}'s inventory`
        : "Your inventory",
    };

    const modelName = {
      singular: "mulaka",
      plural: "Milaka",
    };

    const headers = [...(filtersCookie ? [setCookie(filtersCookie)] : [])];
    return json(
      data({
        header,
        items: kraals,
        totalItems: totalKraals,
        totalPages,
        modelName,
        perPage,
        page,
        searchFieldLabel: "Search kraals",
        searchFieldTooltip: {
          title: "Search your kraal database",
          text: "Search kraal based on kraal name or description, category, tag, location, custodian name. Simply separate your keywords by a space: 'Laptop lenovo 2020'.",
        },
        filters,
        organizationId,
      }),
      {
        headers,
      }
    );
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    throw json(error(reason), { status: reason.status });
  }
}

export async function action({ context, request }: ActionFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    const formData = await request.formData();

    const { intent } = parseData(
      formData,
      z.object({ intent: z.enum(["bulk-delete"]) })
    );

    const intent2ActionMap: { [K in typeof intent]: PermissionAction } = {
      "bulk-delete": PermissionAction.delete,
    };

    const { organizationId } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.asset,
      action: intent2ActionMap[intent],
    });

    switch (intent) {
      case "bulk-delete": {
        const { assetIds, currentSearchParams } = parseData(
          formData,
          z
            .object({ assetIds: z.array(z.string()).min(1) })
            .and(CurrentSearchParamsSchema)
        );

        await bulkDeleteAssets({
          assetIds,
          organizationId,
          userId,
          currentSearchParams,
        });

        sendNotification({
          title: "Assets deleted",
          message: "Your assets has been deleted successfully",
          icon: { name: "success", variant: "success" },
          senderId: authSession.userId,
        });

        return json(data({ success: true }));
      }

      default: {
        checkExhaustiveSwitch(intent);
        return json(data(null));
      }
    }
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    return json(error(reason), { status: reason.status });
  }
}

export function shouldRevalidate({
  actionResult,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  /**
   * If we are toggliong the sidebar, no need to revalidate this loader.
   * Revalidation happens in _layout
   */
  if (actionResult?.isTogglingSidebar) {
    return false;
  }

  return defaultShouldRevalidate;
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: appendToMetaTitle(data?.header.title) },
];

export default function AssetIndexPage() {
  const { roles } = useUserRoleHelper();

  return (
    <>
      <Header>
        <When
          truthy={userHasPermission({
            roles,
            entity: PermissionEntity.asset,
            action: PermissionAction.create,
          })}
        >
          <>
            <Button
              to="new"
              role="link"
              aria-label={`New Kraal`}
              icon="asset"
              data-test-id="createNewKraal"
            >
              New kraal
            </Button>
          </>
        </When>
      </Header>
      <KraalList />
    </>
  );
}

export const KraalList = ({
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
        ItemComponent={ListKraalContent}
        /**
         * Using remix's navigate is the default behaviour, however it can receive also a custom function
         */
        navigate={(itemId) => navigate(`/kraals/${itemId}`)}
        bulkActions={disableBulkActions ? undefined : <BulkActionsDropdown />}
        customEmptyStateContent={
          customEmptyState ? customEmptyState : undefined
        }
        headerChildren={
          <>
            <Th>Capacity</Th>
            <Th>Location</Th>
          </>
        }
      />
    </ListContentWrapper>
  );
};

const ListKraalContent = ({
  item,
}: {
  item: Kraal & {
    location: {
      name: string;
    };
  };
}) => {
  const { location } = item;
  return (
    <>
      {/* Item */}
      <Td className="w-full whitespace-normal p-0 md:p-0">
        <div className="flex justify-between gap-3 p-4  md:justify-normal md:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex size-12 shrink-0 items-center justify-center">
              <AssetImage
                asset={{
                  assetId: item.id,
                  mainImage: "", // TODO Add main image to Kraal model
                  mainImageExpiration: null,
                  alt: item.name,
                }}
                className="size-full rounded-[4px] border object-cover"
              />
            </div>
            <div className="min-w-[130px]">
              <span className="word-break mb-1 block font-medium">
                {item.name}
              </span>
            </div>
            {/* description */}
            <div className="hidden md:block">
              <span className="text-gray-500">{item.description}</span>
            </div>
          </div>
        </div>
      </Td>
      {/* Capacity */}
      <Td>
        <GrayBadge>{item.capacity}</GrayBadge>
      </Td>
      {/* Location */}
      <Td>{location ? <GrayBadge>{location.name}</GrayBadge> : null}</Td>
    </>
  );
};

export const ListItemTagsColumn = ({ tags }: { tags: Tag[] | undefined }) => {
  const visibleTags = tags?.slice(0, 2);
  const remainingTags = tags?.slice(2);

  return tags && tags?.length > 0 ? (
    <div className="">
      {visibleTags?.map((tag) => (
        <TagBadge key={tag.id} className="mr-2">
          {tag.name}
        </TagBadge>
      ))}
      {remainingTags && remainingTags?.length > 0 ? (
        <TagBadge
          className="mr-2 w-6 text-center"
          title={`${remainingTags?.map((t) => t.name).join(", ")}`}
        >
          {`+${tags.length - 2}`}
        </TagBadge>
      ) : null}
    </div>
  ) : null;
};
