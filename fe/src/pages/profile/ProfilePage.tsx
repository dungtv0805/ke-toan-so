import { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Avatar, 
  Typography, 
  Divider, 
  Tag, 
  Descriptions,
  message,
  Tabs,
  Alert
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  LockOutlined, 
  SaveOutlined,
  KeyOutlined,
  SafetyOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { vaiTroOptions, quyenHanTheoVaiTro } from '@/mock-data/nguoi-dung';

const { Title, Text } = Typography;

// Validation schemas
const profileSchema = z.object({
  hoTen: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100, 'Họ tên tối đa 100 ký tự'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự').max(50, 'Mật khẩu tối đa 50 ký tự'),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const roleInfo = vaiTroOptions.find(v => v.value === user?.vaiTro);
  const permissions = user ? quyenHanTheoVaiTro[user.vaiTro] || [] : [];

  const handleProfileSubmit = async (values: { hoTen: string }) => {
    try {
      const validated = profileSchema.parse(values);
      setProfileLoading(true);
      
      await authService.updateProfile({ hoTen: validated.hoTen });
      
      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }
      
      message.success('Cập nhật thông tin thành công');
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          message.error(err.message);
        });
      } else {
        message.error('Có lỗi xảy ra khi cập nhật thông tin');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (values: { 
    currentPassword: string; 
    newPassword: string; 
    confirmPassword: string 
  }) => {
    try {
      passwordSchema.parse(values);
      setPasswordLoading(true);
      
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      
      message.success('Đổi mật khẩu thành công');
      passwordForm.resetFields();
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          message.error(err.message);
        });
      } else if (error instanceof Error) {
        message.error(error.message || 'Có lỗi xảy ra khi đổi mật khẩu');
      } else {
        message.error('Có lỗi xảy ra khi đổi mật khẩu');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Text type="secondary">Vui lòng đăng nhập</Text>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'info',
      label: (
        <span>
          <UserOutlined className="mr-2" />
          Thông tin cá nhân
        </span>
      ),
      children: (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <div className="text-center">
              <Avatar 
                size={100} 
                style={{ backgroundColor: roleInfo?.color || '#1890ff' }}
                icon={<UserOutlined />}
                className="mb-4"
              />
              <Title level={4} className="!mb-1">{user.hoTen}</Title>
              <Text type="secondary" className="block mb-3">{user.email}</Text>
              <Tag color={roleInfo?.color} className="text-sm">
                {roleInfo?.label}
              </Tag>
              <Divider />
              <div className="text-left">
                <Text type="secondary" className="text-xs uppercase tracking-wide">Mô tả vai trò</Text>
                <p className="text-sm mt-1">{roleInfo?.description}</p>
              </div>
            </div>
          </Card>

          {/* Edit Form */}
          <Card title="Chỉnh sửa thông tin" className="lg:col-span-2">
            <Form
              form={profileForm}
              layout="vertical"
              initialValues={{
                hoTen: user.hoTen,
              }}
              onFinish={handleProfileSubmit}
            >
              <Form.Item
                name="hoTen"
                label="Họ và tên"
                rules={[
                  { required: true, message: 'Vui lòng nhập họ tên' },
                  { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự' },
                  { max: 100, message: 'Họ tên tối đa 100 ký tự' },
                ]}
              >
                <Input 
                  prefix={<UserOutlined className="text-muted-foreground" />}
                  placeholder="Nhập họ và tên"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="Email"
              >
                <Input 
                  prefix={<MailOutlined className="text-muted-foreground" />}
                  value={user.email}
                  disabled
                  size="large"
                />
                <Text type="secondary" className="text-xs mt-1 block">
                  Email không thể thay đổi
                </Text>
              </Form.Item>

              <Form.Item
                label="Vai trò"
              >
                <Input 
                  value={roleInfo?.label}
                  disabled
                  size="large"
                />
                <Text type="secondary" className="text-xs mt-1 block">
                  Vai trò được quản lý bởi Admin
                </Text>
              </Form.Item>

              <Form.Item className="mb-0">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={profileLoading}
                  icon={<SaveOutlined />}
                  size="large"
                >
                  Lưu thay đổi
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      ),
    },
    {
      key: 'password',
      label: (
        <span>
          <LockOutlined className="mr-2" />
          Đổi mật khẩu
        </span>
      ),
      children: (
        <div className="max-w-xl">
          <Card title="Đổi mật khẩu">
            <Alert
              message="Lưu ý bảo mật"
              description="Mật khẩu nên có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số."
              type="info"
              showIcon
              className="mb-6"
            />
            
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordSubmit}
            >
              <Form.Item
                name="currentPassword"
                label="Mật khẩu hiện tại"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
              >
                <Input.Password 
                  prefix={<KeyOutlined className="text-muted-foreground" />}
                  placeholder="Nhập mật khẩu hiện tại"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
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
                label="Xác nhận mật khẩu mới"
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
                  prefix={<SafetyOutlined className="text-muted-foreground" />}
                  placeholder="Nhập lại mật khẩu mới"
                  size="large"
                />
              </Form.Item>

              <Form.Item className="mb-0">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={passwordLoading}
                  icon={<LockOutlined />}
                  size="large"
                >
                  Đổi mật khẩu
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      ),
    },
    {
      key: 'permissions',
      label: (
        <span>
          <SafetyOutlined className="mr-2" />
          Quyền hạn
        </span>
      ),
      children: (
        <Card title="Quyền hạn của bạn">
          <Descriptions 
            column={1} 
            bordered
            size="small"
            className="mb-6"
          >
            <Descriptions.Item label="Vai trò">
              <Tag color={roleInfo?.color}>{roleInfo?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả">
              {roleInfo?.description}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={user.trangThai === 'HOAT_DONG' ? 'success' : 'error'}>
                {user.trangThai === 'HOAT_DONG' ? 'Đang hoạt động' : 'Đã khóa'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Title level={5} className="!mb-4">Danh sách quyền hạn</Title>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permissions.map((permission, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
              >
                <CheckCircleOutlined className="text-green-500" />
                <Text>{permission}</Text>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Title level={3} className="!mb-1">Thông tin cá nhân</Title>
        <Text type="secondary">Quản lý thông tin tài khoản và bảo mật</Text>
      </div>

      {/* Tabs */}
      <Tabs 
        items={tabItems} 
        defaultActiveKey="info"
        size="large"
      />
    </div>
  );
};

export default ProfilePage;
