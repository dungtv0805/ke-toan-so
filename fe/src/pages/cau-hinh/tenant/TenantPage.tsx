import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Switch, message, Space, Tag, Popconfirm, Divider, Tooltip, Radio, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UserOutlined, UserAddOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { usePagePermission } from '@/hooks/usePagePermission';
import { tenantService, Tenant, CreateTenantDto, UpdateTenantDto } from '@/services/tenantService';
import TenantMembersModal from './TenantMembersModal';

const DEFAULT_PASSWORD = '123456';

interface UserOption {
  id: string;
  email: string;
  hoTen: string;
}

type AdminMode = 'existing' | 'new';

const TenantPage = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [membersTenant, setMembersTenant] = useState<Tenant | null>(null);
  const [adminMode, setAdminMode] = useState<AdminMode>('new');
  const [form] = Form.useForm();
  const { canCreate, canEdit, canDelete } = usePagePermission("/cau-hinh/tenant");

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

  const fetchUsers = async () => {
    try {
      const data = await tenantService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Không thể tải danh sách người dùng', error);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchUsers();
  }, []);

  const handleCreate = () => {
    setEditingTenant(null);
    setAdminMode('new');
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      adminPassword: DEFAULT_PASSWORD,
      adminMode: 'new',
    });
    setModalVisible(true);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    form.setFieldsValue({
      name: tenant.name,
      slug: tenant.slug,
      maSoThue: tenant.maSoThue,
      diaChi: tenant.diaChi,
      dienThoai: tenant.dienThoai,
      email: tenant.email,
      nguoiDaiDien: tenant.nguoiDaiDien,
      isActive: tenant.isActive,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await tenantService.deleteTenant(id);
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
        // Add admin info based on mode
        const formValues = form.getFieldsValue(true);

        const createData: CreateTenantDto = {
          name: values.name!,
          slug: values.slug!,
          maSoThue: formValues.maSoThue,
          diaChi: formValues.diaChi,
          dienThoai: formValues.dienThoai,
          email: formValues.email,
          nguoiDaiDien: formValues.nguoiDaiDien,
          isActive: values.isActive,
        };

        if (adminMode === 'existing' && formValues.existingUserId) {
          // Use existing user
          createData.adminUserId = formValues.existingUserId;
        } else if (adminMode === 'new' && formValues.adminEmail && formValues.adminHoTen) {
          // Create new user
          createData.admin = {
            email: formValues.adminEmail,
            hoTen: formValues.adminHoTen,
            password: formValues.adminPassword || DEFAULT_PASSWORD,
          };
        }

        const result = await tenantService.create(createData);

        if (result.admin) {
          const selectedUser = adminMode === 'existing'
            ? users.find(u => u.id === formValues.existingUserId)
            : null;

          message.success(
            <span>
              Đã tạo công ty <strong>{result.tenant.name}</strong> với Admin: <strong>{result.admin.email}</strong>
              {adminMode === 'new' && (
                <>
                  <br />
                  <span className="text-gray-500">Mật khẩu: {formValues.adminPassword || DEFAULT_PASSWORD}</span>
                </>
              )}
              {adminMode === 'existing' && selectedUser && (
                <>
                  <br />
                  <span className="text-gray-500">Đã gán user {selectedUser.hoTen} làm Admin</span>
                </>
              )}
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
      title: 'Mã số thuế',
      dataIndex: 'maSoThue',
      key: 'maSoThue',
      render: (mst: string) => mst || <span className="text-gray-400">-</span>,
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'diaChi',
      key: 'diaChi',
      ellipsis: true,
      render: (dc: string) => dc || <span className="text-gray-400">-</span>,
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
          <Tooltip title="Quản lý thành viên">
            <Button
              type="text"
              icon={<TeamOutlined />}
              onClick={() => setMembersTenant(record)}
            />
          </Tooltip>
          {canEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Xác nhận xóa?"
              description="Bạn có chắc muốn xóa công ty này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
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
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Thêm công ty
          </Button>
        )}
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
            name="maSoThue"
            label="Mã số thuế"
            rules={[{ required: true, message: 'Vui lòng nhập mã số thuế' }]}
          >
            <Input placeholder="VD: 0123456789" />
          </Form.Item>

          <Form.Item
            name="diaChi"
            label="Địa chỉ"
            rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}
          >
            <Input placeholder="VD: 123 Nguyễn Huệ, Q.1, TP.HCM" />
          </Form.Item>

          <Form.Item name="dienThoai" label="Số điện thoại">
            <Input placeholder="VD: 028 1234 5678" />
          </Form.Item>

          <Form.Item name="email" label="Email công ty">
            <Input placeholder="VD: info@congty.com" />
          </Form.Item>

          <Form.Item name="nguoiDaiDien" label="Người đại diện pháp luật">
            <Input placeholder="VD: Nguyễn Văn A" />
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

              <Form.Item name="adminMode" label="Chọn cách thêm Admin">
                <Radio.Group
                  value={adminMode}
                  onChange={(e) => setAdminMode(e.target.value)}
                >
                  <Radio.Button value="existing">
                    <UserOutlined /> Chọn user có sẵn
                  </Radio.Button>
                  <Radio.Button value="new">
                    <UserAddOutlined /> Tạo user mới
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              {adminMode === 'existing' ? (
                <>
                  <p className="text-gray-500 text-sm mb-4">
                    Chọn một user có sẵn trong hệ thống để làm Admin cho công ty này.
                  </p>

                  <Form.Item
                    name="existingUserId"
                    label="Chọn User"
                    rules={[{ required: true, message: 'Vui lòng chọn user' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Tìm và chọn user..."
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) ||
                        (option?.email ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={users.map((u) => ({
                        value: u.id,
                        label: u.hoTen,
                        email: u.email,
                      }))}
                      optionRender={(option) => (
                        <div className="flex flex-col">
                          <span>{option.data.label}</span>
                          <span className="text-xs text-gray-400">{option.data.email}</span>
                        </div>
                      )}
                    />
                  </Form.Item>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-sm mb-4">
                    Tạo tài khoản Admin mới để quản lý công ty này.
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

      <TenantMembersModal
        tenant={membersTenant}
        open={!!membersTenant}
        onClose={() => {
          setMembersTenant(null);
          fetchTenants();
        }}
      />
    </div>
  );
};

export default TenantPage;
