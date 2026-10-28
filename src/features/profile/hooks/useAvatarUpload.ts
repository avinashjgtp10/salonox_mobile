import { appAlert as Alert } from "@/services/appAlert";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

import {
  getAvatarFileName,
  getAvatarMimeType,
  validateAvatar,
} from "@/features/profile/utils/avatar";
import { useAppToast } from "@/hooks/useAppToast";
import { setOwnerProfilePhoto, usesSalonLogoAsProfilePhoto } from "@/features/profile/utils/ownerProfilePhoto";
import { uploadAvatarThunk } from "@/middleware/profile/profile.thunk";
import { profileService } from "@/services/profile.service";
import { salonService } from "@/services/salon.service";
import { selectCurrentUser, setCurrentUser } from "@/store/user/user.slice";
import { getApiErrorMessage } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectProfileUploadingAvatar } from "@/store/profile/profile.slice";

const PROFILE_PHOTO_SUCCESS = "Profile photo updated!";
const PROFILE_PHOTO_REMOVED = "Profile photo removed.";

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  allowsEditing: true,
  aspect: [1, 1],
  mediaTypes: ["images"],
  quality: 0.7,
};

type UseAvatarUploadArgs = {
  avatarUrl: string | null | undefined;
  onError: (message: string) => void;
  onStart: () => void;
  onSuccess: (message: string) => void;
};

export function useAvatarUpload({ avatarUrl, onError, onStart, onSuccess }: UseAvatarUploadArgs) {
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const isUploading = useAppSelector(selectProfileUploadingAvatar);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const currentUser = useAppSelector(selectCurrentUser);

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
          return;
        }

        // The Profile screen shows this in its banner; no extra toast.
        onSuccess(PROFILE_PHOTO_SUCCESS);
      } finally {
        setPreviewUri(null);
      }
    },
    [dispatch, onError, onStart, onSuccess],
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

  // Owners clear the salon logo (as the web's Business Settings → Remove logo);
  // staff clear their own photo.
  const removePhoto = useCallback(async () => {
    onStart();
    setIsRemoving(true);
    try {
      if (usesSalonLogoAsProfilePhoto(currentUser)) {
        salonService.clearSalonMeCache();
        const salon = await salonService.getSalonMe();
        await salonService.updateSalon(salon.id, { logo_url: "" });
        setOwnerProfilePhoto(null);
      } else {
        await profileService.removeAvatar();
        if (currentUser) dispatch(setCurrentUser({ ...currentUser, avatarUrl: null }));
      }
      onSuccess(PROFILE_PHOTO_REMOVED);
    } catch (removeError) {
      onError(getApiErrorMessage(removeError));
    } finally {
      setIsRemoving(false);
    }
  }, [currentUser, dispatch, onError, onStart, onSuccess]);

  const changePhoto = useCallback(() => {
    if (isUploading || isRemoving) {
      return;
    }

    Alert.alert("Profile Photo", avatarUrl ? "Change or remove your profile picture" : "Choose a new profile picture", [
      { onPress: () => void pickFromSource("camera"), text: "Take Photo" },
      { onPress: () => void pickFromSource("library"), text: "Choose from Library" },
      ...(avatarUrl ? [{ onPress: () => void removePhoto(), style: "destructive" as const, text: "Remove Photo" }] : []),
      { style: "cancel", text: "Cancel" },
    ]);
  }, [avatarUrl, isRemoving, isUploading, pickFromSource, removePhoto]);

  return {
    avatarUri: previewUri ?? avatarUrl ?? null,
    changePhoto,
    isUploading: isUploading || isRemoving,
  };
}
