import { motion } from "framer-motion";
import { Camera, Mic, Volume2, type LucideIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CAMERA_OPTIONS = ["FaceTime HD Camera", "Logitech C920 Webcam", "External USB Camera"];
const MICROPHONE_OPTIONS = ["Built-in Microphone", "AirPods Pro", "Blue Yeti USB Mic"];
const SPEAKER_OPTIONS = ["Built-in Speakers", "AirPods Pro", "External Headphones"];

export interface DeviceSelectorValues {
  camera: string;
  microphone: string;
  speaker: string;
}

export interface DeviceSelectorProps {
  values: DeviceSelectorValues;
  onChange: (field: keyof DeviceSelectorValues, value: string) => void;
}

function DeviceRow({
  icon: Icon,
  label,
  options,
  value,
  onValueChange,
}: {
  icon: LucideIcon;
  label: string;
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-xl border-white/20 bg-white/60 backdrop-blur-md dark:bg-white/5">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DeviceSelector({ values, onChange }: DeviceSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
      className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:p-6"
    >
      <h2 className="mb-4 font-display text-base font-semibold text-foreground">
        Device Selection
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DeviceRow
          icon={Camera}
          label="Camera"
          options={CAMERA_OPTIONS}
          value={values.camera}
          onValueChange={(value) => onChange("camera", value)}
        />
        <DeviceRow
          icon={Mic}
          label="Microphone"
          options={MICROPHONE_OPTIONS}
          value={values.microphone}
          onValueChange={(value) => onChange("microphone", value)}
        />
        <DeviceRow
          icon={Volume2}
          label="Speaker"
          options={SPEAKER_OPTIONS}
          value={values.speaker}
          onValueChange={(value) => onChange("speaker", value)}
        />
      </div>
    </motion.div>
  );
}
