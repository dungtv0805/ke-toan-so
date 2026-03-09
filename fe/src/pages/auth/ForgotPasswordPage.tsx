import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { authService } from '@/services/authService';

const { Title, Text } = Typography;

const ForgotPasswordPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(values.email);
      setSubmitted(true);
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại sau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0" styles={{ body: { padding: 32 } }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <Title level={3} className="!mb-1">Master CEO</Title>
          </div>

          {submitted ? (
            <Result
              icon={<MailOutlined style={{ color: '#1890ff' }} />}
              title="Kiểm tra email của bạn"
              subTitle="Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư (bao gồm thư mục spam)."
              extra={
                <Link to="/login">
                  <Button type="primary" icon={<ArrowLeftOutlined />}>
                    Quay lại đăng nhập
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="text-center mb-6">
                <Text type="secondary">
                  Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu
                </Text>
              </div>

              {error && (
                <Alert
                  message={error}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError(null)}
                  className="mb-4"
                />
              )}

              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
              >
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email' },
                    { type: 'email', message: 'Email không hợp lệ' },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined className="text-muted-foreground" />}
                    placeholder="Nhập email"
                    size="large"
                  />
                </Form.Item>

                <Form.Item className="mb-2">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<MailOutlined />}
                    size="large"
                    block
                  >
                    Gửi yêu cầu
                  </Button>
                </Form.Item>
              </Form>

              <div className="text-center mt-4">
                <Link to="/login" className="text-primary hover:underline text-sm">
                  <ArrowLeftOutlined className="mr-1" />
                  Quay lại đăng nhập
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
