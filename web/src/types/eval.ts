export interface SceneData {
  scene_name: string;
  data: Record<string, any>[];
  loading: boolean;
  error?: string;
}

export type Platform = "arm" | "x86";
