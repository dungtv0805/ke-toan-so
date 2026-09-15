import React from 'react';
import { Result, Button, Typography, Collapse } from 'antd';

const { Paragraph, Text } = Typography;

interface Props {
  children: React.ReactNode;
}

interface State {
  loi: Error | null;
  chiTiet: string;
}

/**
 * Chặn lỗi render để một trang hỏng không biến cả màn hình thành trắng tinh.
 *
 * React gỡ toàn bộ cây giao diện khi có lỗi không bắt được — người dùng chỉ
 * thấy một trang trắng, không thông báo, không cách nào biết chuyện gì xảy ra
 * hay phải làm gì. Đây đúng cùng một loại vấn đề với việc máy chủ trả
 * "An unexpected error occurred": hỏng thì phải nói hỏng ở đâu.
 *
 * Thông báo lỗi kỹ thuật được giấu trong phần gập lại: kế toán không cần đọc,
 * nhưng khi báo lỗi thì copy được nguyên văn cho người sửa.
 */
export class ChanLoi extends React.Component<Props, State> {
  state: State = { loi: null, chiTiet: '' };

  static getDerivedStateFromError(loi: Error): Partial<State> {
    return { loi };
  }

  componentDidCatch(loi: Error, info: React.ErrorInfo) {
    this.setState({ chiTiet: `${loi.stack ?? loi.message}\n${info.componentStack ?? ''}` });
    // Giữ lại trong console để còn xem được khi mở DevTools.
    console.error('Lỗi giao diện:', loi, info);
  }

  render() {
    if (!this.state.loi) return this.props.children;

    return (
      <Result
        status="error"
        title="Màn hình này gặp lỗi"
        subTitle="Phần còn lại của phần mềm vẫn dùng được. Thử tải lại trang; nếu vẫn lỗi, gửi nội dung bên dưới cho bộ phận kỹ thuật."
        extra={[
          <Button type="primary" key="tai-lai" onClick={() => window.location.reload()}>
            Tải lại trang
          </Button>,
          <Button key="quay-lai" onClick={() => window.history.back()}>
            Quay lại
          </Button>,
        ]}
      >
        <Paragraph>
          <Text type="danger">{this.state.loi.message}</Text>
        </Paragraph>
        {this.state.chiTiet && (
          <Collapse
            size="small"
            items={[
              {
                key: 'ct',
                label: 'Chi tiết kỹ thuật',
                children: (
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>
                    {this.state.chiTiet}
                  </pre>
                ),
              },
            ]}
          />
        )}
      </Result>
    );
  }
}

export default ChanLoi;
