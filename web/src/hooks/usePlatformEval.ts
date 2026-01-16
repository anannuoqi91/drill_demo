import { useEffect, useMemo, useState } from "react";
import type { Platform, SceneData } from "../types/eval";
import {
  getAllScenes,
  getSceneData,
  getMultiVersionSceneData,
  getSceneDataSpSummary,
  getMultiVersionSceneDataSpSummary,
} from "../api/home";

export function usePlatformEval(params: {
  platform: Platform;
  useMultiVersionMode: boolean;
  selectedOdVersions: string[];
  refreshNonce: number;
  evalModule?: string; // 新增 eval_module 参数
}) {
  const { platform, useMultiVersionMode, selectedOdVersions, refreshNonce, evalModule } = params;

  const [platformScenes, setPlatformScenes] = useState<string[]>([]);
  const [scenesData, setScenesData] = useState<SceneData[]>([]);
  const [allSceneData, setAllSceneData] = useState<Record<string, any>[]>([]);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [errorScenes, setErrorScenes] = useState<string | undefined>(undefined);

  // 拉场景列表 + 拉数据（一次串起来）
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingScenes(true);
      setErrorScenes(undefined);

      try {
        // 1) scenes list
        const sceneResp = await getAllScenes({ platform, eval_module: evalModule });
        const sceneNames = (sceneResp.rows ?? [])
          .map((r: any) => r.scene_name)
          .filter(Boolean);

        if (cancelled) return;

        setPlatformScenes(sceneNames);

        // 先把卡片置为 loading
        setScenesData(
          sceneNames.map((name: string) => ({
            scene_name: name,
            data: [],
            loading: true,
          }))
        );

        // 2) data rows
        const isStopbarAbsolute = evalModule === "stopbar_absolute";
        const dataResp =
          useMultiVersionMode && selectedOdVersions.length > 0
            ? await (isStopbarAbsolute ? getMultiVersionSceneDataSpSummary : getMultiVersionSceneData)({
                od_versions: selectedOdVersions,
                baseinfo: { platform, data_fix: "_FK_" },
                eval_module: evalModule, // 传递 eval_module 参数
              })
            : await (isStopbarAbsolute ? getSceneDataSpSummary : getSceneData)({
                od_version: "latest",
                baseinfo: { platform, data_fix: "_FK_" },
                eval_module: evalModule, // 传递 eval_module 参数
              });

        if (cancelled) return;

        const rows = dataResp.rows ?? [];
        setAllSceneData(rows);

        // 用 Map 一次分发，避免 platformScenes.map + filter 的 O(S*N)
        const byScene = new Map<string, any[]>();
        for (const r of rows) {
          const k = String(r?.scene_name ?? "");
          if (!k) continue;
          const arr = byScene.get(k);
          if (arr) arr.push(r);
          else byScene.set(k, [r]);
        }

        setScenesData(
          sceneNames.map((name: string) => ({
            scene_name: name,
            data: byScene.get(name) ?? [],
            loading: false,
          }))
        );
      } catch (e: any) {
        if (cancelled) return;
        setErrorScenes(String(e?.message ?? e));
        setPlatformScenes([]);
        setAllSceneData([]);
        setScenesData([]);
      } finally {
        if (!cancelled) setLoadingScenes(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [platform, refreshNonce, useMultiVersionMode, selectedOdVersions, evalModule]); // 添加 evalModule 依赖

  const summaryText = useMemo(() => {
    if (loadingScenes) return "正在加载场景数据...";
    if (errorScenes) return `加载失败: ${errorScenes}`;
    if (platformScenes.length === 0) return "暂无场景";
    return `${platform}平台 - 共 ${platformScenes.length} 个场景，总数据: ${allSceneData.length} 条${
      useMultiVersionMode && selectedOdVersions.length > 0
        ? `，显示版本: ${selectedOdVersions.join(", ")}`
        : "，默认显示最新版本"
    }${evalModule ? `，评测模块: ${evalModule}` : ""}`; // 添加评测模块信息
  }, [platform, loadingScenes, errorScenes, platformScenes.length, allSceneData.length, useMultiVersionMode, selectedOdVersions, evalModule]); // 添加 evalModule 依赖

  return {
    platformScenes,
    scenesData,
    allSceneData,
    loadingScenes,
    errorScenes,
    summaryText,
  };
}