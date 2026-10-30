"use client";

import React from "react";
import { ConfigProvider, App } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";

// Cấu hình ngôn ngữ tiếng Việt cho dayjs
dayjs.locale("vi");

export const AntdConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: "#00B18A",
          colorPrimaryHover: "#009675",
          colorLink: "#00B18A",
          colorLinkHover: "#009675",
          colorSuccess: "#10B981",
          colorWarning: "#F59E0B",
          colorError: "#EF4444",
          colorInfo: "#00B18A",
          borderRadius: 4, // Chuẩn hóa góc bo vi mô 4px
          fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorBgContainer: "#FFFFFF",
          colorBgLayout: "#F8FAF9",
          colorBorderSecondary: "#F1F5F9",
        },
        components: {
          Card: {
            // Loại bỏ khung viền cứng của thẻ Card
            colorBorderSecondary: "transparent",
            headerBg: "transparent",
            boxShadowTertiary: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
          },
          Table: {
            // Chuẩn hóa bảng dữ liệu: bỏ vạch phân cách dọc, chỉ giữ hairline ngang
            headerBg: "#FAFAFA",
            headerSplitColor: "transparent",
            headerColor: "#475569",
            rowHoverBg: "#F8FAF9",
            borderColor: "#F1F5F9",
            cellPaddingBlock: 12,
            cellPaddingInline: 14,
            borderRadius: 0,
          },
          Button: {
            borderRadius: 4,
            controlHeight: 34,
            fontWeight: 600,
          },
          Input: {
            borderRadius: 4,
            controlHeight: 34,
          },
          Select: {
            borderRadius: 4,
            controlHeight: 34,
          },
          Modal: {
            borderRadiusLG: 8,
          },
          Drawer: {
            borderRadiusSM: 4,
          },
          Tag: {
            borderRadiusSM: 4,
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
};

