/**
 * 随机点名算法模块
 * 提供多种随机选择算法和优化策略
 */

class CallAlgorithm {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.lastSelectedStudent = null;
        this.selectedStudents = new Set();
        this.avoidImmediateRepeat = false;
    }

    /**
     * 设置是否避免立即重复
     */
    setAvoidImmediateRepeat(avoid) {
        this.avoidImmediateRepeat = avoid;
        if (!avoid) {
            this.selectedStudents.clear();
        }
    }

    /**
     * 重置选择状态
     */
    reset() {
        this.selectedStudents.clear();
        this.lastSelectedStudent = null;
    }

    /**
     * 公平随机算法 - 每个学生被选中的概率相等
     * @param {Array} students - 学生数组
     * @returns {Object|null} 选中的学生信息
     */
    fairRandom(students) {
        if (!students || students.length === 0) {
            return null;
        }

        // 如果只有一个学生，直接返回
        if (students.length === 1) {
            return students[0];
        }

        // 如果启用了避免立即重复，且已经选择过学生
        if (this.avoidImmediateRepeat && this.selectedStudents.size < students.length - 1) {
            // 过滤掉已经选择过的学生
            const availableStudents = students.filter(student => 
                !this.selectedStudents.has(student.id)
            );
            
            if (availableStudents.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableStudents.length);
                return availableStudents[randomIndex];
            }
        }

        // 正常随机选择
        const randomIndex = Math.floor(Math.random() * students.length);
        return students[randomIndex];
    }

    /**
     * 权重随机算法 - 根据点名次数分配权重，次数越少权重越高
     * @param {Array} students - 学生数组
     * @returns {Object|null} 选中的学生信息
     */
    weightedRandom(students) {
        if (!students || students.length === 0) {
            return null;
        }

        // 如果只有一个学生，直接返回
        if (students.length === 1) {
            return students[0];
        }

        // 计算每个学生的权重（基于点名次数）
        const studentsWithWeights = students.map(student => {
            const callCount = student.callCount || 0;
            // 权重 = 基础权重 + (最大点名次数 - 当前点名次数)
            const maxCallCount = Math.max(...students.map(s => s.callCount || 0));
            const baseWeight = 1;
            const weight = baseWeight + (maxCallCount - callCount);
            return { student, weight };
        });

        // 如果启用了避免立即重复，给未选择的学生额外权重
        if (this.avoidImmediateRepeat && this.selectedStudents.size < students.length - 1) {
            studentsWithWeights.forEach(item => {
                if (!this.selectedStudents.has(item.student.id)) {
                    item.weight *= 2; // 未选择的学生获得双倍权重
                }
            });
        }

        // 使用权重随机选择
        return this.selectByWeight(studentsWithWeights);
    }

    /**
     * 最少点名优先算法 - 优先选择被点名次数最少的学生
     * @param {Array} students - 学生数组
     * @returns {Object|null} 选中的学生信息
     */
    leastCalledFirst(students) {
        if (!students || students.length === 0) {
            return null;
        }

        // 如果只有一个学生，直接返回
        if (students.length === 1) {
            return students[0];
        }

        // 按点名次数排序（升序）
        const sortedStudents = [...students].sort((a, b) => {
            const callCountA = a.callCount || 0;
            const callCountB = b.callCount || 0;
            
            // 如果启用了避免立即重复，优先选择未选择过的学生
            if (this.avoidImmediateRepeat) {
                const selectedA = this.selectedStudents.has(a.id);
                const selectedB = this.selectedStudents.has(b.id);
                
                if (selectedA && !selectedB) return 1;
                if (!selectedA && selectedB) return -1;
            }
            
            return callCountA - callCountB;
        });

        // 如果启用了避免立即重复且还有未选择的学生
        if (this.avoidImmediateRepeat) {
            const unselectedStudents = sortedStudents.filter(student => 
                !this.selectedStudents.has(student.id)
            );
            
            if (unselectedStudents.length > 0) {
                // 在最少被点名的学生中随机选择
                const minCallCount = Math.min(...unselectedStudents.map(s => s.callCount || 0));
                const leastCalledStudents = unselectedStudents.filter(s => 
                    (s.callCount || 0) === minCallCount
                );
                
                const randomIndex = Math.floor(Math.random() * leastCalledStudents.length);
                return leastCalledStudents[randomIndex];
            }
        }

        // 从最少被点名的学生中随机选择
        const minCallCount = Math.min(...sortedStudents.map(s => s.callCount || 0));
        const leastCalledStudents = sortedStudents.filter(s => 
            (s.callCount || 0) === minCallCount
        );

        const randomIndex = Math.floor(Math.random() * leastCalledStudents.length);
        return leastCalledStudents[randomIndex];
    }

    /**
     * 循环轮转算法 - 按顺序依次选择，确保每个学生都被点到
     * @param {Array} students - 学生数组
     * @returns {Object|null} 选中的学生信息
     */
    roundRobin(students) {
        if (!students || students.length === 0) {
            return null;
        }

        // 如果只有一个学生，直接返回
        if (students.length === 1) {
            return students[0];
        }

        // 如果还没有选择过任何学生，从第一个开始
        if (this.selectedStudents.size === 0) {
            return students[0];
        }

        // 找到最后一个选择的学生
        const lastIndex = students.findIndex(s => s.id === this.lastSelectedStudent);
        let nextIndex = (lastIndex + 1) % students.length;

        // 如果启用避免立即重复，跳过刚刚选择过的学生
        if (this.avoidImmediateRepeat && this.selectedStudents.size >= students.length - 1) {
            // 如果所有学生都选择过了，重置选择状态
            this.selectedStudents.clear();
            return students[nextIndex];
        }

        return students[nextIndex];
    }

    /**
     * 时间均衡算法 - 基于时间间隔来平衡点名频率
     * @param {Array} students - 学生数组
     * @returns {Object|null} 选中的学生信息
     */
    timeBalanced(students) {
        if (!students || students.length === 0) {
            return null;
        }

        // 如果只有一个学生，直接返回
        if (students.length === 1) {
            return students[0];
        }

        // 计算每个学生的"等待时间"得分
        const studentsWithScores = students.map(student => {
            const now = new Date();
            const lastCalled = student.lastCalled ? new Date(student.lastCalled) : new Date(0);
            const callCount = student.callCount || 0;
            
            // 时间间隔（小时）
            const timeDiff = (now - lastCalled) / (1000 * 60 * 60);
            
            // 基础等待时间得分
            let score = timeDiff;
            
            // 如果从未被点名，给予额外得分
            if (callCount === 0) {
                score += 24; // 额外24小时得分
            }
            
            // 考虑被点名次数少的优先
            score += (students.length - callCount) * 2;
            
            // 如果启用了避免立即重复，给未选择的学生额外得分
            if (this.avoidImmediateRepeat && !this.selectedStudents.has(student.id)) {
                score += 10;
            }
            
            return { student, score };
        });

        // 按得分排序
        studentsWithScores.sort((a, b) => b.score - a.score);

        // 在前几个高分学生中随机选择
        const topCandidates = studentsWithScores.slice(0, Math.min(3, studentsWithScores.length));
        const randomIndex = Math.floor(Math.random() * topCandidates.length);
        
        return topCandidates[randomIndex].student;
    }

    /**
     * 分组随机算法 - 将学生分成若干组，随机选择一组，然后在该组内随机选择
     * @param {Array} students - 学生数组
     * @param {number} groupCount - 分组数量
     * @returns {Object|null} 选中的学生信息
     */
    groupRandom(students, groupCount = 3) {
        if (!students || students.length === 0) {
            return null;
        }

        // 如果学生数量少于分组数量，使用普通随机算法
        if (students.length < groupCount) {
            return this.fairRandom(students);
        }

        // 随机打乱学生数组
        const shuffled = [...students].sort(() => Math.random() - 0.5);
        
        // 分组
        const groups = [];
        const groupSize = Math.ceil(students.length / groupCount);
        
        for (let i = 0; i < groupCount; i++) {
            const start = i * groupSize;
            const end = Math.min(start + groupSize, students.length);
            groups.push(shuffled.slice(start, end));
        }

        // 随机选择一个组
        const randomGroupIndex = Math.floor(Math.random() * groups.length);
        const selectedGroup = groups[randomGroupIndex];

        // 在选中的组内使用公平随机算法
        return this.fairRandom(selectedGroup);
    }

    /**
     * 根据权重选择
     * @param {Array} studentsWithWeights - 包含权重的学生数组
     * @returns {Object} 选中的学生
     */
    selectByWeight(studentsWithWeights) {
        const totalWeight = studentsWithWeights.reduce((sum, item) => sum + item.weight, 0);
        
        if (totalWeight <= 0) {
            // 如果总权重为0，使用普通随机选择
            const randomIndex = Math.floor(Math.random() * studentsWithWeights.length);
            return studentsWithWeights[randomIndex].student;
        }

        let random = Math.random() * totalWeight;
        
        for (const item of studentsWithWeights) {
            random -= item.weight;
            if (random <= 0) {
                return item.student;
            }
        }

        // 如果由于精度问题没有选中，返回最后一个
        return studentsWithWeights[studentsWithWeights.length - 1].student;
    }

    /**
     * 选择学生的主入口方法
     * @param {Array} students - 学生数组
     * @param {string} algorithm - 算法类型
     * @param {Object} options - 选项
     * @returns {Object|null} 选中的学生
     */
    async selectStudent(students, algorithm = 'fair', options = {}) {
        if (!students || students.length === 0) {
            return null;
        }

        // 更新设置
        this.setAvoidImmediateRepeat(options.avoidImmediateRepeat || false);

        // 过滤学生：非完全随机模式下排除具有特殊状态的学生
        let availableStudents = [...students];
        if (algorithm !== 'fair' && this.storageManager) {
            // 过滤掉具有特殊排除状态的学生
            availableStudents = await this.filterStudentsBySpecialStatus(availableStudents, algorithm);
            
            // 如果过滤后没有可用学生，提示用户
            if (availableStudents.length === 0) {
                console.warn('所有学生都被设置为特殊排除状态，无法进行点名');
                return null;
            }
        }

        let selectedStudent;

        switch (algorithm) {
            case 'fair':
                selectedStudent = this.fairRandom(availableStudents);
                break;
            case 'weighted':
                selectedStudent = this.weightedRandom(availableStudents);
                break;
            case 'leastCalled':
                selectedStudent = this.leastCalledFirst(availableStudents);
                break;
            case 'roundRobin':
                selectedStudent = this.roundRobin(availableStudents);
                break;
            case 'timeBalanced':
                selectedStudent = this.timeBalanced(availableStudents);
                break;
            case 'group':
                selectedStudent = this.groupRandom(availableStudents, options.groupCount || 3);
                break;
            default:
                selectedStudent = this.fairRandom(availableStudents);
        }

        // 更新选择状态
        if (selectedStudent) {
            this.lastSelectedStudent = selectedStudent.id;
            if (this.avoidImmediateRepeat) {
                this.selectedStudents.add(selectedStudent.id);
                
                // 如果所有学生都选择过，重置选择状态
                if (this.selectedStudents.size >= availableStudents.length) {
                    this.selectedStudents.clear();
                }
            }
        }

        return selectedStudent;
    }

    /**
     * 根据学生特殊状态过滤学生列表
     * @param {Array} students - 学生数组
     * @param {string} algorithm - 当前使用的算法
     * @returns {Promise<Array>} 过滤后的学生数组
     */
    async filterStudentsBySpecialStatus(students, algorithm) {
        if (!this.storageManager || algorithm === 'fair') {
            return students;
        }

        const filteredStudents = [];
        
        for (const student of students) {
            // 检查学生是否应被排除
            const shouldExclude = await this.storageManager.shouldExcludeStudent(student.id, algorithm);
            
            if (!shouldExclude) {
                filteredStudents.push(student);
            }
        }
        
        return filteredStudents;
    }

    /**
     * 批量选择多个学生（不重复）
     * @param {Array} students - 学生数组
     * @param {number} count - 选择数量
     * @param {string} algorithm - 算法类型
     * @param {Object} options - 选项
     * @returns {Array} 选中的学生数组
     */
    selectMultipleStudents(students, count, algorithm = 'fair', options = {}) {
        if (!students || students.length === 0 || count <= 0) {
            return [];
        }

        const selected = [];
        const availableStudents = [...students];
        const originalAvoidRepeat = this.avoidImmediateRepeat;

        // 批量选择时临时启用避免重复
        this.setAvoidImmediateRepeat(true);

        for (let i = 0; i < Math.min(count, students.length); i++) {
            const selectedStudent = this.selectStudent(availableStudents, algorithm, options);
            if (selectedStudent) {
                selected.push(selectedStudent);
                // 从可用学生中移除已选择的学生
                const index = availableStudents.findIndex(s => s.id === selectedStudent.id);
                if (index !== -1) {
                    availableStudents.splice(index, 1);
                }
            }
        }

        // 恢复原始设置
        this.setAvoidImmediateRepeat(originalAvoidRepeat);

        return selected;
    }

    /**
     * 获取算法说明
     * @param {string} algorithm - 算法类型
     * @returns {string} 算法说明
     */
    getAlgorithmDescription(algorithm) {
        const descriptions = {
            fair: '每个学生被选中的概率相等，完全随机选择',
            weighted: '根据点名次数分配权重，点名次数越少被选中的概率越高',
            leastCalled: '优先选择被点名次数最少的学生，确保公平分配',
            roundRobin: '按顺序依次选择每个学生，保证每个人都有机会被点到',
            timeBalanced: '基于时间间隔和点名次数进行平衡，避免某些学生长期未被点到',
            group: '将学生随机分成若干组，随机选择一组然后在该组内随机选择'
        };

        return descriptions[algorithm] || '未知算法';
    }

    /**
     * 获取所有支持的算法
     * @returns {Array} 算法列表
     */
    getAvailableAlgorithms() {
        return [
            { value: 'fair', name: '公平随机', description: this.getAlgorithmDescription('fair') },
            { value: 'weighted', name: '权重随机', description: this.getAlgorithmDescription('weighted') },
            { value: 'leastCalled', name: '最少点名优先', description: this.getAlgorithmDescription('leastCalled') },
            { value: 'roundRobin', name: '循环轮转', description: this.getAlgorithmDescription('roundRobin') },
            { value: 'timeBalanced', name: '时间均衡', description: this.getAlgorithmDescription('timeBalanced') },
            { value: 'group', name: '分组随机', description: this.getAlgorithmDescription('group') }
        ];
    }

    /**
     * 预测下一个可能被选中的学生（用于显示预期结果）
     * @param {Array} students - 学生数组
     * @param {string} algorithm - 算法类型
     * @param {Object} options - 选项
     * @returns {Array} 预测的可能学生列表（按概率排序）
     */
    predictNextStudents(students, algorithm = 'fair', options = {}) {
        if (!students || students.length === 0) {
            return [];
        }

        // 这里可以实现各种算法的预测逻辑
        // 简化实现，返回概率最高的前几个学生
        const predictions = [];

        switch (algorithm) {
            case 'fair':
                // 公平随机，所有学生概率相等
                students.forEach(student => {
                    predictions.push({
                        student,
                        probability: 1 / students.length,
                        reason: '每个学生概率相等'
                    });
                });
                break;

            case 'weighted':
                // 权重随机，点名次数少的概率高
                const maxCallCount = Math.max(...students.map(s => s.callCount || 0));
                students.forEach(student => {
                    const weight = (maxCallCount - (student.callCount || 0)) + 1;
                    predictions.push({
                        student,
                        probability: weight,
                        reason: `权重: ${weight} (点名${student.callCount || 0}次)`
                    });
                });
                break;

            case 'leastCalled':
                // 最少点名优先
                const sortedStudents = [...students].sort((a, b) => (a.callCount || 0) - (b.callCount || 0));
                sortedStudents.forEach((student, index) => {
                    predictions.push({
                        student,
                        probability: 1 / (index + 1),
                        reason: `最少点名排序第${index + 1}位`
                    });
                });
                break;

            default:
                // 其他算法使用公平随机
                return this.predictNextStudents(students, 'fair', options);
        }

        // 按概率排序
        predictions.sort((a, b) => b.probability - a.probability);

        return predictions.slice(0, 5); // 返回前5个最可能的学生
    }
}