import { useState } from "react";
import type { Cattle } from "@prisma/client";

import { useFetcher } from "@remix-run/react";
import type { action } from "~/routes/api+/asset.refresh-main-image";
import { tw } from "~/utils/tw";
import { Dialog } from "../layout/dialog";
import { Button } from "../shared/button";

export const CattleImage = ({
  cattle,
  className,
  withPreview = false,
  ...rest
}: {
  cattle: {
    cattleId: Cattle["id"];
    mainImage: Cattle["mainImage"];
    alt: string;
  };
  withPreview?: boolean;
  className?: string;
  rest?: HTMLImageElement;
}) => {
  const fetcher = useFetcher<typeof action>();
  const { cattleId, mainImage, alt } = cattle;
  const updatedAssetMainImage = fetcher.data?.error
    ? null
    : fetcher.data?.asset.mainImage;
  const url =
    mainImage ||
    updatedAssetMainImage ||
    "/static/images/asset-placeholder.jpg";

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <img
        onClick={withPreview ? handleOpenDialog : undefined}
        src={url}
        className={tw(className)}
        alt={alt}
        {...rest}
      />
      {withPreview && (
        <Dialog
          open={isDialogOpen}
          onClose={handleCloseDialog}
          className="h-[90vh] w-full p-0 md:h-[calc(100vh-4rem)] md:w-[90%]"
          title={
            <div>
              <div className=" text-lg font-semibold text-gray-900">
                {cattle.alt}
              </div>
              <div className="text-sm font-normal text-gray-600">
                1 image(s)
              </div>
            </div>
          }
        >
          <div
            className={
              "relative z-10 flex h-full flex-col bg-white shadow-lg md:rounded"
            }
          >
            <div className="flex max-h-[calc(100%-4rem)] grow items-center justify-center border-y border-gray-200 bg-gray-50">
              <img src={url} className={"max-h-full"} alt={alt} />
            </div>
            <div className="flex w-full justify-center gap-3 px-6 py-3 md:justify-end">
              <Button to={`/cattle/${cattleId}/edit`} variant="secondary">
                Edit image(s)
              </Button>
              <Button variant="secondary" onClick={handleCloseDialog}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
};
