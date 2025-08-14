#!/usr/bin/env node

// 测试Claude CLI原始性能
import { execa } from 'execa';

async function testClaudeCLI() {
    console.log('🔬 测试Claude CLI原始性能...');
    
    const startTime = Date.now();
    
    try {
        const { stdout, stderr } = await execa('claude', ['--print', '简单回复：你好'], {
            timeout: 15000
        });
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        console.log('📊 Claude CLI性能测试结果:');
        console.log(`• 总耗时: ${totalTime}ms`);
        console.log(`• 响应长度: ${stdout.length} 字符`);
        console.log(`• 响应内容: ${stdout}`);
        console.log(`• 处理速度: ${Math.round(stdout.length / totalTime * 1000)} 字符/秒`);
        
        if (stderr) {
            console.log(`• 错误输出: ${stderr}`);
        }
        
    } catch (error) {
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        console.log('❌ Claude CLI测试失败:');
        console.log(`• 耗时: ${totalTime}ms`);
        console.log(`• 错误: ${error.message}`);
        console.log(`• 退出码: ${error.exitCode}`);
        
        if (error.stdout) {
            console.log(`• 标准输出: ${error.stdout}`);
        }
        if (error.stderr) {
            console.log(`• 错误输出: ${error.stderr}`);
        }
    }
}

testClaudeCLI();