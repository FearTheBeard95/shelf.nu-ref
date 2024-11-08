import {
  json,
  type MetaFunction,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useAtomValue } from "jotai";
import { dynamicTitleAtom } from "~/atoms/dynamic-title-atom";
import { KraalForm } from "~/components/kraals/form";
import Header from "~/components/layout/header";
import { type HeaderData } from "~/components/layout/header/types";
import { useSearchParams } from "~/hooks/search-params";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { makeShelfError } from "~/utils/error";
import { data, error } from "~/utils/http.server";

const title = "New cattle";
const header: HeaderData = {
  title,
};

export function loader({ context }: LoaderFunctionArgs) {
  const authSession = context.getSession();
  const { userId } = authSession;

  try {
    return json(data({ header, userId }));
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    throw json(error(reason));
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.header.title) : "" },
];

export const handle = {
  breadcrumb: () => <span>{title}</span>,
};

export default function NewCattlePage() {
  // const title = useAtomValue(dynamicTitleAtom);
  // const [searchParams] = useSearchParams();
  // const { kraalId } = searchParams.get("kraalId");

  return (
    <>
      <div>New cattle form</div>
    </>
  );
}
