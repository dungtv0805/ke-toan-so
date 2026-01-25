import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Divider, Tag, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { vaiTroOptions } from '@/mock-data/nguoi-dung';

const { Title, Text, Paragraph } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true);
    setError(null);

    const result = await login(values.email, values.password);
    
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Đăng nhập thất bại');
    }
    
    setLoading(false);
  };

  const handleQuickLogin = (email: string) => {
    form.setFieldsValue({ email, password: 'Password123!' });
  };

  const demoAccounts = [
    { email: 'admin@company.com', role: 'ADMIN', label: 'Quản trị viên' },
    { email: 'ketoanquy@company.com', role: 'KE_TOAN_QUY', label: 'Kế toán quỹ' },
    { email: 'ketoancongno@company.com', role: 'KE_TOAN_CONG_NO', label: 'Kế toán công nợ' },
    { email: 'manager@company.com', role: 'MANAGER', label: 'Quản lý' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0" styles={{ body: { padding: 32 } }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <Title level={3} className="!mb-1">Master CEO</Title>
            <Text type="secondary">Đăng nhập để tiếp tục</Text>
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
                prefix={<UserOutlined className="text-muted-foreground" />}
                placeholder="Nhập email"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-muted-foreground" />}
                placeholder="Nhập mật khẩu"
                size="large"
              />
            </Form.Item>

            <Form.Item className="mb-2">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<LoginOutlined />}
                size="large"
                block
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <Divider plain>
            <Text type="secondary" className="text-xs">Đăng nhập nhanh (Demo)</Text>
          </Divider>

          <div className="space-y-2">
            {demoAccounts.map((account) => {
              const roleInfo = vaiTroOptions.find(v => v.value === account.role);
              return (
                <Button
                  key={account.email}
                  type="dashed"
                  block
                  size="small"
                  onClick={() => handleQuickLogin(account.email)}
                  className="text-left flex items-center justify-between"
                >
                  <Space>
                    <Tag color={roleInfo?.color} className="m-0">{account.label}</Tag>
                  </Space>
                  <Text type="secondary" className="text-xs">{account.email}</Text>
                </Button>
              );
            })}
          </div>

          <Paragraph type="secondary" className="text-center text-xs mt-4 !mb-0">
            Mật khẩu mặc định: <Text code>Password123!</Text>
          </Paragraph>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
