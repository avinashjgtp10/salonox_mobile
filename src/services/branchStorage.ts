import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVE_BRANCH_ID_KEY = "salonox.activeBranchId";

export const branchStorage = {
  async getActiveBranchId() {
    return AsyncStorage.getItem(ACTIVE_BRANCH_ID_KEY);
  },

  async setActiveBranchId(branchId: string) {
    await AsyncStorage.setItem(ACTIVE_BRANCH_ID_KEY, branchId);
  },

  async clearActiveBranchId() {
    await AsyncStorage.removeItem(ACTIVE_BRANCH_ID_KEY);
  },
};
