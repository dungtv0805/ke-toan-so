import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Switch, message, Space, Tag, Popconfirm, Divider, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { tenantService, Tenant, CreateTenantDto, UpdateTenantDto } from '@/services/tenantService';

const DEFAULT_PASSWORD = '123456';

const TenantPage = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [form] = Form.useForm();

  // Only super admin can access this page
  if (!user?.isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">
          Bạn không có quyền truy cập trang này. Chỉ Super Admin mới có thể quản lý Tenant.
        </div>
      </div>
    );
  }

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const data = await tenantService.getAll();
      setTenants(data);
    } catch (error) {
      message.error('Không thể tải danh sách công ty');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreate = () => {
    setEditingTenant(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      adminPassword: DEFAULT_PASSWORD, // Auto fill default password
    });
    setModalVisible(true);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    form.setFieldsValue({
      name: tenant.name,
      slug: tenant.slug,
      isActive: tenant.isActive,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await tenantService.delete(id);
      message.success('Đã xóa công ty');
      fetchTenants();
    } catch (error) {
      message.error('Không thể xóa công ty');
    }
  };

  const handleSubmit = async (values: CreateTenantDto | UpdateTenantDto) => {
    try {
      if (editingTenant) {
        await tenantService.update(editingTenant.id, values);
        message.success('Đã cập nhật công ty');
      } else {
        const createData: CreateTenantDto = {
          name: values.name!,
          slug: values.slug!,
          isActive: values.isActive,
        };

        // Add admin info if provided
        const formValues = form.getFieldsValue(true);
        if (formValues.adminEmail && formValues.adminHoTen) {
          createData.admin = {
            email: formValues.adminEmail,
            hoTen: formValues.adminHoTen,
            password: formValues.adminPassword || DEFAULT_PASSWORD,
          };
        }

        const result = await tenantService.create(createData);

        if (result.admin) {
          message.success(
            <span>
              Đã tạo công ty <strong>{result.tenant.name}</strong> với Admin: <strong>{result.admin.email}</strong>
              <br />
              <span className="text-gray-500">Mật khẩu: {formValues.adminPassword || DEFAULT_PASSWORD}</span>
            </span>,
            5
          );
        } else {
          message.success('Đã tạo công ty mới');
        }
      }
      setModalVisible(false);
      fetchTenants();
    } catch (error) {
      message.error(editingTenant ? 'Không thể cập nhật công ty' : 'Không thể tạo công ty');
    }
  };

  const columns = [
    {
      title: 'Tên công ty',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => <code className="bg-gray-100 px-2 py-1 rounded">{slug}</code>,
    },
    {
      title: 'Admin',
      dataIndex: 'admins',
      key: 'admins',
      render: (admins: Tenant['admins']) => {
        if (!admins || admins.length === 0) {
          return <span className="text-gray-400">Chưa có</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {admins.map((admin) => (
              <Tooltip key={admin.id} title={admin.email}>
                <Tag icon={<UserOutlined />} color="blue">
                  {admin.hoTen}
                </Tag>
              </Tooltip>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, record: Tenant) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Xác nhận xóa?"
            description="Bạn có chắc muốn xóa công ty này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TeamOutlined /> Quản lý Công ty (Tenant)
          </h1>
          <p className="text-gray-500 mt-1">
            Quản lý danh sách các công ty trong hệ thống
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Thêm công ty
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={tenants}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingTenant ? 'Chỉnh sửa công ty' : 'Thêm công ty mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Tên công ty"
            rules={[{ required: true, message: 'Vui lòng nhập tên công ty' }]}
          >
            <Input placeholder="VD: Công ty ABC" />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Slug (định danh)"
            rules={[
              { required: true, message: 'Vui lòng nhập slug' },
              { pattern: /^[a-z0-9-]+$/, message: 'Slug chỉ chứa chữ thường, số và dấu gạch ngang' },
            ]}
            extra="Slug dùng để định danh công ty, VD: cong-ty-abc"
          >
            <Input placeholder="VD: cong-ty-abc" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" />
          </Form.Item>

          {/* Admin section - only show when creating */}
          {!editingTenant && (
            <>
              <Divider>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <UserOutlined /> Tài khoản Admin
                </span>
              </Divider>

              <p className="text-gray-500 text-sm mb-4">
                Tạo tài khoản Admin để quản lý công ty này. Admin có thể tạo thêm người dùng sau.
              </p>

              <Form.Item
                name="adminHoTen"
                label="Họ tên Admin"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên Admin' }]}
              >
                <Input placeholder="VD: Nguyễn Văn A" />
              </Form.Item>

              <Form.Item
                name="adminEmail"
                label="Email Admin"
                rules={[
                  { required: true, message: 'Vui lòng nhập email Admin' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input placeholder="VD: admin@congty.com" />
              </Form.Item>

              <Form.Item
                name="adminPassword"
                label="Mật khẩu"
                extra={`Mật khẩu mặc định: ${DEFAULT_PASSWORD}`}
              >
                <Input.Password placeholder="Nhập mật khẩu" />
              </Form.Item>
            </>
          )}

          <Form.Item className="mb-0 flex justify-end">
            <Space>
              <Button onClick={() => setModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                {editingTenant ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TenantPage;
