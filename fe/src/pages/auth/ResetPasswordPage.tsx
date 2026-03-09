import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Result } from 'antd';
import { LockOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { authService } from '@/services/authService';

const { Title, Text } = Typography;

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

const ResetPasswordPage = () => {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  const redirectToLogin = useCallback(() => {
    const timer = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 3000);
    return timer;
  }, [navigate]);

  useEffect(() => {
    if (!success) return;
    const timer = redirectToLogin();
    return () => clearTimeout(timer);
  }, [success, redirectToLogin]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0" styles={{ body: { padding: 32 } }}>
            <Result
              status="error"
              title="Link không hợp lệ"
              subTitle="Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."
              extra={
                <Link to="/login">
                  <Button type="primary" icon={<ArrowLeftOutlined />}>
                    Quay lại đăng nhập
                  </Button>
                </Link>
              }
            />
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = async (values: ResetPasswordForm) => {
    setLoading(true);
    setError(null);

    try {
      await authService.resetPassword(token, values.newPassword);
      setSuccess(true);
    } catch {
      setError('Token không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
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

          {success ? (
            <Result
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="Đặt lại mật khẩu thành công"
              subTitle="Bạn sẽ được chuyển về trang đăng nhập sau 3 giây..."
              extra={
                <Link to="/login">
                  <Button type="primary" icon={<ArrowLeftOutlined />}>
                    Đăng nhập ngay
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="text-center mb-6">
                <Text type="secondary">Nhập mật khẩu mới cho tài khoản của bạn</Text>
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
                  name="newPassword"
                  label="Mật khẩu mới"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                    { max: 50, message: 'Mật khẩu tối đa 50 ký tự' },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-muted-foreground" />}
                    placeholder="Nhập mật khẩu mới"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="Xác nhận mật khẩu"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-muted-foreground" />}
                    placeholder="Nhập lại mật khẩu mới"
                    size="large"
                  />
                </Form.Item>

                <Form.Item className="mb-2">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<LockOutlined />}
                    size="large"
                    block
                  >
                    Đặt lại mật khẩu
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

export default ResetPasswordPage;
