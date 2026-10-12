import React, { useEffect, useRef, useMemo } from "react";
import { ServerContext } from "@/state/server";
import { SocketEvent } from "@/components/server/events";
import useWebsocketEvent from "@/plugins/useWebsocketEvent";
import {
  UPlotChart,
  primaryChartStyle,
  useChart,
  useChartTickLabel,
} from "@/components/server/console/chart";
import { hexToRgba } from "@/lib/helpers";
import { bytesToString } from "@/lib/formatters";
import { CloudDownload, CloudUpload } from "lucide-react";
import { theme } from "@/lib/theme";
import ChartBlock from "@/components/server/console/ChartBlock";
import Tooltip from "@/components/elements/tooltip/Tooltip";

export default () => {
  const status = ServerContext.useStoreState((state) => state.status.value);
  const limits = ServerContext.useStoreState(
    (state) => state.server.data!.limits,
  );
  const previous = useRef<Record<"tx" | "rx", number>>({ tx: -1, rx: -1 });

  const cpu = useChartTickLabel("CPU", limits.cpu, "%", 2);
  const memory = useChartTickLabel("Memory", limits.memory, "MiB");
  const networkOptions = useMemo(
    () => ({
      sets: 2,
      formatTick: (value: number) => bytesToString(value),
      series: [
        {
          label: "Network Out",
          ...primaryChartStyle,
        },
        {
          label: "Network In",
          stroke: theme("colors.yellow.400"),
          fill: hexToRgba(theme("colors.yellow.700"), 0.5),
        },
      ],
    }),
    [],
  );
  const network = useChart("Network", networkOptions);

  useEffect(() => {
    if (status === "offline") {
      cpu.clear();
      memory.clear();
      network.clear();
    }
  }, [status]);

  useWebsocketEvent(SocketEvent.STATS, (data: string) => {
    let values: any = {};
    try {
      values = JSON.parse(data);
    } catch {
      return;
    }
    cpu.push(values.cpu_absolute);
    memory.push(Math.floor(values.memory_bytes / 1024 / 1024));
    network.push([
      previous.current.tx < 0
        ? 0
        : Math.max(0, values.network.tx_bytes - previous.current.tx),
      previous.current.rx < 0
        ? 0
        : Math.max(0, values.network.rx_bytes - previous.current.rx),
    ]);

    previous.current = {
      tx: values.network.tx_bytes,
      rx: values.network.rx_bytes,
    };
  });

  return (
    <>
      <ChartBlock title={"CPU Load"}>
        <UPlotChart {...cpu.props} />
      </ChartBlock>
      <ChartBlock title={"Memory"}>
        <UPlotChart {...memory.props} />
      </ChartBlock>
      <ChartBlock
        title={"Network"}
        legend={
          <>
            <Tooltip arrow content={"Inbound"}>
              <CloudDownload className={"mr-2 h-4 w-4 text-yellow-400"} />
            </Tooltip>
            <Tooltip arrow content={"Outbound"}>
              <CloudUpload className={"text-primary-400 h-4 w-4"} />
            </Tooltip>
          </>
        }
      >
        <UPlotChart {...network.props} />
      </ChartBlock>
    </>
  );
};
