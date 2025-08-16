import { db } from '../db';
import { proxiesTable, usersTable, proxyLogsTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, sql, desc } from 'drizzle-orm';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get proxy counts and status distribution
    const proxyStats = await db.select({
      total_proxies: sql<string>`count(*)`,
      online_proxies: sql<string>`count(*) filter (where status = 'online')`,
      offline_proxies: sql<string>`count(*) filter (where status = 'offline')`,
    })
    .from(proxiesTable)
    .execute();

    const proxyStatsData = proxyStats[0] || {
      total_proxies: '0',
      online_proxies: '0',
      offline_proxies: '0',
    };

    // Get total user count
    const userStats = await db.select({
      total_users: sql<string>`count(*)`
    })
    .from(usersTable)
    .execute();

    const totalUsers = parseInt(userStats[0]?.total_users || '0', 10);

    // Get recent logs (last 10) with proxy information
    const recentLogsQuery = await db.select({
      id: proxyLogsTable.id,
      proxy_id: proxyLogsTable.proxy_id,
      client_ip: proxyLogsTable.client_ip,
      login_time: proxyLogsTable.login_time,
      logout_time: proxyLogsTable.logout_time,
      bytes_transferred: proxyLogsTable.bytes_transferred,
      created_at: proxyLogsTable.created_at,
    })
    .from(proxyLogsTable)
    .innerJoin(proxiesTable, eq(proxyLogsTable.proxy_id, proxiesTable.id))
    .orderBy(desc(proxyLogsTable.created_at))
    .limit(10)
    .execute();

    // Map the recent logs to match schema format
    const recentLogs = recentLogsQuery.map(log => ({
      id: log.id,
      proxy_id: log.proxy_id,
      client_ip: log.client_ip,
      login_time: log.login_time,
      logout_time: log.logout_time,
      bytes_transferred: log.bytes_transferred,
      created_at: log.created_at,
    }));

    // Active proxies are those that are online
    const activeProxies = parseInt(proxyStatsData.online_proxies, 10);

    return {
      active_proxies: activeProxies,
      total_proxies: parseInt(proxyStatsData.total_proxies, 10),
      online_proxies: parseInt(proxyStatsData.online_proxies, 10),
      offline_proxies: parseInt(proxyStatsData.offline_proxies, 10),
      total_users: totalUsers,
      recent_logs: recentLogs,
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
};