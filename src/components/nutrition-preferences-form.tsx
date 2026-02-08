"use client";

import { Label } from "@/components/ui/label";

interface NutritionPreferencesFormProps {
  goal: "lose" | "maintain" | "gain";
  formData: {
    lossPaceKgPerMonth?: number;
    maintenanceAdjustKcalPerDay?: number;
    gainPaceKgPerMonth?: number;
    gainStrategy?: "lean" | "standard" | "aggressive";
    macroPreset?: "balanced" | "lowfat" | "lowcarb" | "highprotein";
  };
  onFormChange: (
    updates: Partial<NutritionPreferencesFormProps["formData"]>
  ) => void;
  selectClassName?: string;
}

export function NutritionPreferencesForm({
  goal,
  formData,
  onFormChange,
  selectClassName = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
}: NutritionPreferencesFormProps) {
  return (
    <>
      {goal === "lose" && (
        <div className="space-y-2">
          <Label>減量ペース（kg/月）</Label>
          <select
            className={selectClassName}
            value={formData.lossPaceKgPerMonth}
            onChange={(e) =>
              onFormChange({ lossPaceKgPerMonth: Number(e.target.value) })
            }
          >
            <option value={0.5}>0.5 kg/月（ゆるめ）</option>
            <option value={1}>1.0 kg/月（標準）</option>
            <option value={2}>2.0 kg/月（しっかり）</option>
          </select>
        </div>
      )}

      {goal === "maintain" && (
        <div className="space-y-2">
          <Label>微調整（kcal/日）</Label>
          <select
            className={selectClassName}
            value={formData.maintenanceAdjustKcalPerDay}
            onChange={(e) =>
              onFormChange({
                maintenanceAdjustKcalPerDay: Number(e.target.value),
              })
            }
          >
            <option value={-200}>-200（少し絞る）</option>
            <option value={-100}>-100（微減）</option>
            <option value={0}>0（現状維持）</option>
            <option value={100}>+100（微増）</option>
            <option value={200}>+200（少し増やす）</option>
          </select>
        </div>
      )}

      {goal === "gain" && (
        <>
          <div className="space-y-2">
            <Label>増量ペース（kg/月）</Label>
            <select
              className={selectClassName}
              value={formData.gainPaceKgPerMonth}
              onChange={(e) =>
                onFormChange({ gainPaceKgPerMonth: Number(e.target.value) })
              }
            >
              <option value={0.25}>0.25 kg/月（ゆっくり）</option>
              <option value={0.5}>0.5 kg/月（標準）</option>
              <option value={1}>1.0 kg/月（速め）</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>増量方針（やり方）</Label>
            <select
              className={selectClassName}
              value={formData.gainStrategy}
              onChange={(e) =>
                onFormChange({
                  gainStrategy: e.target.value as
                    | "lean"
                    | "standard"
                    | "aggressive",
                })
              }
            >
              <option value="lean">リーン（脂肪増を抑えたい）</option>
              <option value="standard">標準（バランス）</option>
              <option value="aggressive">しっかり（体重を増やしたい）</option>
            </select>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>食事方針（PFC）</Label>
        <select
          className={selectClassName}
          value={formData.macroPreset}
          onChange={(e) =>
            onFormChange({
              macroPreset: e.target.value as
                | "balanced"
                | "lowfat"
                | "lowcarb"
                | "highprotein",
            })
          }
        >
          <option value="balanced">バランス</option>
          <option value="lowfat">ローファット</option>
          <option value="lowcarb">ローカーボ</option>
          <option value="highprotein">高たんぱく</option>
        </select>
      </div>
    </>
  );
}
