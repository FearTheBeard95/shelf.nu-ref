import type {
  MetaFunction,
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { z } from "zod";
import ContextualModal from "~/components/layout/contextual-modal";
import ContextualSidebar from "~/components/layout/contextual-sidebar";
import type { HeaderData } from "~/components/layout/header/types";

import { Card } from "~/components/shared/card";
import { Tag } from "~/components/shared/tag";
import { usePosition } from "~/hooks/use-position";
import { KRAAL_OVERVIEW_FIELDS } from "~/modules/asset/fields";
import {
  getKraal,
  updateAssetBookingAvailability,
} from "~/modules/asset/service.server";

import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { checkExhaustiveSwitch } from "~/utils/check-exhaustive-switch";
import { getClientHint, getDateTimeFormat } from "~/utils/client-hints";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { makeShelfError } from "~/utils/error";
import { error, getParams, data, parseData } from "~/utils/http.server";

export const AvailabilityForBookingFormSchema = z.object({
  availableToBook: z
    .string()
    .transform((val) => val === "on")
    .default("false"),
});

export async function loader({ context, request, params }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  const { kraalId: id } = getParams(params, z.object({ kraalId: z.string() }), {
    additionalData: { userId },
  });

  try {
    const { locale, timeZone } = getClientHint(request);

    const kraal = await getKraal({
      id,
      userId,
      include: KRAAL_OVERVIEW_FIELDS,
    });

    const header: HeaderData = {
      title: `${kraal.name}'s overview`,
    };

    return json(
      data({
        kraal: {
          ...kraal,
          createdAt: getDateTimeFormat(request, {
            dateStyle: "short",
            timeStyle: "short",
          }).format(kraal.createdAt),
        },

        header,
        locale,
        timeZone,
      })
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
  breadcrumb: () => "Overview",
};

export async function action({ context, request, params }: ActionFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;
  const { assetId: id } = getParams(params, z.object({ assetId: z.string() }), {
    additionalData: { userId },
  });

  try {
    const formData = await request.formData();
    const { intent } = parseData(
      formData,
      z.object({ intent: z.enum(["toggle"]) })
    );

    if (intent === "toggle") {
      const { availableToBook } = parseData(
        formData,
        AvailabilityForBookingFormSchema
      );

      await updateAssetBookingAvailability(id, availableToBook);

      sendNotification({
        title: "Asset availability status updated successfully",
        message: "Your asset's availability for booking has been updated",
        icon: { name: "success", variant: "success" },
        senderId: authSession.userId,
      });
      return json(data(null));
    } else {
      checkExhaustiveSwitch(intent);
      return json(data(null));
    }
  } catch (cause) {
    const reason = makeShelfError(cause, { userId, id });
    return json(error(reason), { status: reason.status });
  }
}

export default function KraalOverview() {
  const { kraal } = useLoaderData<typeof loader>();

  const location = kraal && kraal.location;
  usePosition();

  return (
    <div>
      <ContextualModal />
      <div className="mx-[-16px] mt-[-16px] block md:mx-0 lg:flex">
        <div className="flex-1 overflow-hidden">
          <Card className="my-3 px-[-4] py-[-5] md:border">
            <ul className="item-information">
              <li className="w-full border-b-[1.1px] border-b-gray-100 p-4 last:border-b-0 md:flex">
                <span className="w-1/4 text-[14px] font-medium text-gray-900">
                  ID
                </span>
                <div className="mt-1 w-3/5 text-gray-600 md:mt-0">
                  {kraal?.id}
                </div>
              </li>
              <li className="w-full border-b-[1.1px] border-b-gray-100 p-4 last:border-b-0 md:flex">
                <span className="w-1/4 text-[14px] font-medium text-gray-900">
                  Created
                </span>
                <div className="mt-1 w-3/5 text-gray-600 md:mt-0">
                  {kraal && kraal.createdAt}
                </div>
              </li>

              {location ? (
                <li className="w-full border-b-[1.1px] border-b-gray-100 p-4 last:border-b-0 md:flex">
                  <span className="w-1/4 text-[14px] font-medium text-gray-900">
                    Location
                  </span>
                  <div className="-ml-2 mt-1 text-gray-600 md:mt-0 md:w-3/5">
                    <Tag key={location.id} className="ml-2">
                      {location.name}
                    </Tag>
                  </div>
                </li>
              ) : null}
              {kraal.capacity ? (
                <li className="w-full border-b-[1.1px] border-b-gray-100 p-4 last:border-b-0 md:flex">
                  <span className="w-1/4 text-[14px] font-medium text-gray-900">
                    Number of cattle
                  </span>
                  <div className="-ml-2 mt-1 text-gray-600 md:mt-0 md:w-3/5">
                    <Tag key={"kraal-capacity"} className="ml-2">
                      {kraal.capacity.toString()}
                    </Tag>
                  </div>
                </li>
              ) : null}
            </ul>
          </Card>
        </div>
      </div>
      <ContextualSidebar />
    </div>
  );
}
