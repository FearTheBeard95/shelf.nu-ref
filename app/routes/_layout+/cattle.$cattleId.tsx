import { type FC } from "react";
import { json, redirect } from "@remix-run/node";
import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import mapCss from "maplibre-gl/dist/maplibre-gl.css?url";
import { z } from "zod";
import { AssetImage } from "~/components/assets/asset-image";
import { ActionsDropdown } from "~/components/cattle/actions-dropdown";
import ContextualModal from "~/components/layout/contextual-modal";
import Header from "~/components/layout/header";
import type { HeaderData } from "~/components/layout/header/types";
import { List } from "~/components/list";
import { Filters } from "~/components/list/filters";
import { GrayBadge } from "~/components/shared/gray-badge";
import { Tag as TagBadge } from "~/components/shared/tag";
import TextualDivider from "~/components/shared/textual-divider";
import { Th } from "~/components/table";
import { getCattle } from "~/modules/cattle/service.server";
import { deleteLocation } from "~/modules/location/service.server";
import assetCss from "~/styles/asset.css?url";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import {
  setCookie,
  updateCookieWithPerPage,
  userPrefs,
} from "~/utils/cookies.server";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { makeShelfError } from "~/utils/error";
import {
  data,
  error,
  getCurrentSearchParams,
  getParams,
} from "~/utils/http.server";
import { getParamsValues } from "~/utils/list";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.data";
import { requirePermission } from "~/utils/roles.server";
import { ListCattleContent } from "./kraals.$kraalId.cattle._index";

export async function loader({ context, request, params }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;
  const { cattleId: id } = getParams(
    params,
    z.object({ cattleId: z.string() }),
    {
      additionalData: { userId },
    }
  );

  try {
    const searchParams = getCurrentSearchParams(request);
    const { page, perPageParam, search } = getParamsValues(searchParams);
    const cookie = await updateCookieWithPerPage(request, perPageParam);
    const { perPage } = cookie;

    const { cattle } = await getCattle({
      id,
      perPage,
      page,
      search,
    });

    const header: HeaderData = {
      title:
        cattle.name || cattle.tagNumber || `Cattle belongs to ${cattle.userId}`,
    };

    const modelName = {
      singular: "Offspring",
      plural: "Offspring",
    };

    const offspring = [...cattle.offspringAsDam, ...cattle.offspringAsSire];

    const totalItems = cattle.totalChildren;
    const totalPages = cattle.totalChildren / perPage;

    return json(
      data({
        cattle,
        header,
        modelName,
        items: offspring,
        page,
        totalItems,
        perPage,
        totalPages,
      }),
      {
        headers: [setCookie(await userPrefs.serialize(cookie))],
      }
    );
  } catch (cause) {
    const reason = makeShelfError(cause, { userId, id });
    throw json(error(reason), { status: reason.status });
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: appendToMetaTitle(data?.header?.title) },
];

export const handle = {
  breadcrumb: () => "single",
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: mapCss },
  { rel: "stylesheet", href: assetCss },
];

export async function action({ context, request, params }: ActionFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;
  const { cattleId: id } = getParams(
    params,
    z.object({ cattleId: z.string() }),
    {
      additionalData: { userId },
    }
  );

  try {
    await requirePermission({
      userId: authSession.userId,
      request,
      entity: PermissionEntity.location,
      action: PermissionAction.delete,
    });

    await deleteLocation({ id });

    sendNotification({
      title: "Location deleted",
      message: "Your location has been deleted successfully",
      icon: { name: "trash", variant: "error" },
      senderId: authSession.userId,
    });

    return redirect(`/kraals`);
  } catch (cause) {
    const reason = makeShelfError(cause, { userId, id });
    return json(error(reason), { status: reason.status });
  }
}

export default function CattlePage() {
  const { cattle } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div>
      <Header title={cattle.name}>
        <ActionsDropdown cattle={cattle} />
      </Header>
      <ContextualModal />

      <div className="mt-8 block lg:flex">
        <div className="shrink-0 overflow-hidden lg:w-[250px] 2xl:w-[400px]">
          <AssetImage
            asset={{
              assetId: cattle.id,
              mainImage:
                "https://plus.unsplash.com/premium_photo-1677850452987-d3ff550db018?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
              mainImageExpiration: null,
              alt: cattle.id,
            }}
          />

          <TextualDivider text="Details" className="my-8 lg:hidden" />

          {/* Gender */}
          <div className="mt-4 flex items-center justify-between gap-10 rounded border border-gray-200 px-4 py-5">
            <span className=" text-xs font-medium text-gray-600">Gender</span>
            <span className="font-medium">{cattle.gender}</span>
          </div>
          {/* Age */}
          {cattle.age ? (
            <div className="mt-4 flex items-center justify-between gap-10 rounded border border-gray-200 px-4 py-5">
              <span className=" text-xs font-medium text-gray-600">Age</span>
              <span className="font-medium">{cattle.age} years</span>
            </div>
          ) : null}
          {/* Breed */}
          <div className="mt-4 flex items-center justify-between gap-10 rounded border border-gray-200 px-4 py-5">
            <span className=" text-xs font-medium text-gray-600">Breed</span>
            <span className="font-medium">{cattle.breed}</span>
          </div>
          {/* Health status */}
          {cattle.healthStatus ? (
            <div className="mt-4 flex items-center justify-between gap-10 rounded border border-gray-200 px-4 py-5">
              <span className=" text-xs font-medium text-gray-600">
                Health status
              </span>
              <TagBadge className="bg-green-400">
                {cattle.healthStatus}
              </TagBadge>
            </div>
          ) : null}
          {/* Tag number */}
          {cattle.tagNumber ? (
            <div className="mt-4 flex items-center justify-between gap-10 rounded border border-gray-200 px-4 py-5">
              <span className=" text-xs font-medium text-gray-600">
                Tag number
              </span>
              <span className="font-medium">{cattle.tagNumber}</span>
            </div>
          ) : null}
        </div>

        <div className=" w-full lg:ml-8 lg:w-[calc(100%-282px)]">
          {cattle.sire || cattle.dam ? (
            <TextualDivider text="Parents" className="my-3" />
          ) : null}
          <div className="flex flex-col md:gap-2">
            {/* Sire details */}
            {cattle.sire && <CattleDetail cattle={cattle.sire} />}

            {/* Dam details */}
            {cattle.dam && <CattleDetail cattle={cattle.dam} />}

            {/* Offspring */}
            <TextualDivider text="Offspring" className="my-3" />
            <div className="flex flex-col md:gap-2">
              <Filters className="responsive-filters mb-2 lg:mb-0" />
              <List
                ItemComponent={ListCattleContent}
                navigate={(itemId) => navigate(`/cattle/${itemId}`)}
                headerChildren={
                  <>
                    <Th>Gender</Th>
                    <Th>Breed</Th>
                    <Th>Tag No.</Th>
                  </>
                }
                customEmptyStateContent={{
                  title: "No offspring",
                  text: "This cattle has no offspring",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const CattleDetail: FC<{ cattle: any }> = ({ cattle }) => (
  <Link to={`/cattle/${cattle.id}`}>
    <div className="mt-4 flex items-center gap-10 rounded border border-gray-200 px-4 py-5">
      <div className="relative flex size-12 shrink-0 items-center justify-center">
        <AssetImage
          asset={{
            assetId: cattle.id,
            mainImage:
              "https://plus.unsplash.com/premium_photo-1677850452987-d3ff550db018?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // TODO Use cattle image
            mainImageExpiration: null,
            alt: cattle.id,
          }}
          className="size-full rounded-[4px] border object-cover"
        />
      </div>
      <div className="min-w-[130px]">
        <span className="word-break mb-1 block font-medium">{cattle.name}</span>
        <div className="space-x-2">
          <span className="text-xs text-gray-600">{cattle.breed}</span>
          <span className="text-xs text-gray-600">
            <GrayBadge>Dam</GrayBadge>
          </span>
        </div>
      </div>
    </div>
  </Link>
);
