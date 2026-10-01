import { appAlert as Alert } from "@/services/appAlert";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

import {
  getAvatarFileName,
  getAvatarMimeType,
  validateAvatar,
  withAvatarCacheKey,
} from "@/features/profile/utils/avatar";
import { useAppToast } from "@/hooks/useAppToast";
import { uploadAvatarThunk } from "@/middleware/profile/profile.thunk";
import { getApiErrorMessage } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectProfileUploadingAvatar } from "@/store/profile/profile.slice";

const PROFILE_PHOTO_SUCCESS = "Profile photo updated!";

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  allowsEditing: true,
  aspect: [1, 1],
  mediaTypes: ["images"],
  quality: 0.7,
};

type UseAvatarUploadArgs = {
  avatarUrl: string | null | undefined;
  onError: (message: string) => void;
  /** Called when a picked photo starts uploading, so stale messages can be cleared. */
  onStart: () => void;
  onSuccess: (message: string) => void;
};

/**
 * Lets the user replace their profile photo from the camera or library.
 * While uploading, the picked image is shown immediately as a preview.
 */
export function useAvatarUpload({ avatarUrl, onError, onStart, onSuccess }: UseAvatarUploadArgs) {
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const isUploading = useAppSelector(selectProfileUploadingAvatar);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [cacheKey, setCacheKey] = useState(0);

  const uploadPickedAsset = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      const asset = result.canceled ? undefined : result.assets?.[0];

      if (!asset?.uri) {
        return;
      }

      onStart();

      const pickedImage = {
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
        uri: asset.uri,
      };
      const mimeType = getAvatarMimeType(pickedImage);
      const validationError = validateAvatar(pickedImage, mimeType);

      if (validationError) {
        onError(validationError);
        toast.showError(validationError);
        return;
      }

      setPreviewUri(asset.uri);

      try {
        const resultAction = await dispatch(
          uploadAvatarThunk({
            asset: {
              fileName: getAvatarFileName(pickedImage),
              fileSize: asset.fileSize,
              mimeType,
              uri: asset.uri,
            },
          }),
        );

        if (uploadAvatarThunk.rejected.match(resultAction)) {
          const message = resultAction.payload?.message ?? "Unable to upload photo.";
          onError(message);
          toast.showError(message);
          return;
        }

        setCacheKey(Date.now());
        onSuccess(PROFILE_PHOTO_SUCCESS);
        toast.showSuccess(PROFILE_PHOTO_SUCCESS);
      } finally {
        setPreviewUri(null);
      }
    },
    [dispatch, onError, onStart, onSuccess, toast],
  );

  const pickFromSource = useCallback(
    async (source: "camera" | "library") => {
      try {
        if (source === "camera") {
          const permission = await ImagePicker.requestCameraPermissionsAsync();

          if (!permission.granted) {
            Alert.alert("Camera access needed", "Enable camera access in settings to take a photo.");
            return;
          }

          await uploadPickedAsset(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
          return;
        }

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert("Photo access needed", "Enable photo library access in settings to choose a photo.");
          return;
        }

        await uploadPickedAsset(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
      } catch (pickerError) {
        toast.showError(getApiErrorMessage(pickerError));
      }
    },
    [toast, uploadPickedAsset],
  );

  const changePhoto = useCallback(() => {
    if (isUploading) {
      return;
    }

    Alert.alert("Profile Photo", "Choose a new profile picture", [
      { onPress: () => void pickFromSource("camera"), text: "Take Photo" },
      { onPress: () => void pickFromSource("library"), text: "Choose from Library" },
      { style: "cancel", text: "Cancel" },
    ]);
  }, [isUploading, pickFromSource]);

  return {
    avatarUri: previewUri ?? (avatarUrl ? withAvatarCacheKey(avatarUrl, cacheKey) : null),
    changePhoto,
    isUploading,
  };
}
