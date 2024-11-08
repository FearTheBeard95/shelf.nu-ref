import {
  json,
  type MetaFunction,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { z } from "zod";
import type { HeaderData } from "~/components/layout/header/types";
import { getKraal } from "~/modules/asset/service.server";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { makeShelfError } from "~/utils/error";
import { error, getParams } from "~/utils/http.server";

export async function loader({ context, params }: LoaderFunctionArgs) {
  try {
    const authSession = context.getSession();
    const { userId } = authSession;

    const { kraalId: id } = getParams(
      params,
      z.object({ kraalId: z.string() }),
      {
        additionalData: { userId },
      }
    );

    const kraal = await getKraal({
      id,
      userId,
      include: {
        cattleKraalAssignments: true,
      },
    });

    const header: HeaderData = {
      title: `${kraal.name}'s cattle`,
    };

    return json({
      header,
      kraal,
    });
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

export default function KraalCattle() {
  return <>Kraal cattle</>;
}
